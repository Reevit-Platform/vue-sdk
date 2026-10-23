/**
 * useDirectCharge
 *
 * The state machine behind Reevit's own mobile money screens. It starts a prompt
 * (`charge`), follows the attempt with adaptive polling (`status`), takes an OTP
 * or voucher (`action`), and asks for a fresh prompt (`resend`).
 *
 * Rules it holds to:
 *  - Only `status === 'succeeded'` ends in success. "I've approved" is an immediate
 *    status read, never a shortcut.
 *  - One request of each kind in flight at a time. Every user action carries its
 *    own `attempt_token`; a retry after an unanswered request reuses the token so
 *    the server replays the attempt instead of sending a second prompt.
 *  - Polling follows the server's `poll_after_ms`, backs off on errors, pauses
 *    while the tab is hidden, and stops on abort, unmount or close.
 *  - Running out the clock never ends the attempt on its own authority: the
 *    countdown ends the screen, but the attempt is still watched, so an approval
 *    that lands late still reaches success.
 */

import { getCurrentScope, onScopeDispose, shallowReactive, toValue, type MaybeRefOrGetter } from 'vue';
import type { AttemptFailure, DirectApiError, DirectChargeApi, PublicAttempt } from '../api/direct';

export type DirectPhase = 'idle' | 'starting' | 'waiting' | 'code' | 'submitting' | 'failed' | 'succeeded';

export type DirectFailureKind = 'declined' | 'insufficient' | 'timeout' | 'provider' | 'locked' | 'exhausted' | 'other';

export interface DirectFailure {
  kind: DirectFailureKind;
  title: string;
  message: string;
  retryable: boolean;
  code: string;
}

export interface DirectInput {
  phone: string;
  network?: string;
}

export interface DirectChargeState {
  phase: DirectPhase;
  /** The latest public view of the live attempt. */
  attempt: PublicAttempt | null;
  input: DirectInput | null;
  /** Epoch ms. The prompt stops being approvable here (server `expires_at`, else a 2 minute default). */
  expiresAt: number | null;
  /** Epoch ms the countdown started from. */
  startedAt: number | null;
  /** Epoch ms from which "Resend prompt" is enabled. */
  canResendAt: number | null;
  failure: DirectFailure | null;
  /** A polite status line for the wait and failure panels. */
  notice: string | null;
  /** A line above the form's button (earlier prompt still active, bad number, offline). */
  formNotice: string | null;
  checking: boolean;
  resending: boolean;
  /** The server will send no more prompts for this attempt. */
  resendClosed: boolean;
  codeError: string | null;
  /** `next_action.type` of the code being asked for. */
  codeKind: 'otp' | 'voucher' | null;
}

const FINAL_FAILED = new Set(['failed', 'canceled', 'cancelled', 'expired', 'abandoned']);

/** The prompt window when the server names none. */
export const DEFAULT_PROMPT_WINDOW_MS = 120_000;
/** The server enforces 30 s between prompts. */
const RESEND_COOLDOWN_MS = 30_000;
const MIN_POLL_MS = 1_000;
const MAX_POLL_MS = 15_000;
const DEFAULT_POLL_MS = 2_000;
/** How long a timed-out attempt is still watched for a late approval. */
const WATCH_GRACE_MS = 5 * 60_000;
/** A wrong or slow answer should not make two requests in the same breath. */
const MIN_FORCE_GAP_MS = 800;

export const FAILOVER_NOW = 'Your provider didn’t respond. Retrying with another…';
export const FAILOVER_DONE = 'Your provider didn’t respond — we retried with another and it went through.';

const COPY = {
  checking: 'Checking with your provider…',
  notYet: 'We haven’t received your approval yet.',
  newPrompt: 'New prompt sent.',
  offline: 'Trouble reaching Reevit. Still trying…',
  unreachable: 'Couldn’t reach Reevit. Try again.',
} as const;

const initialState = (): DirectChargeState => ({
  phase: 'idle',
  attempt: null,
  input: null,
  expiresAt: null,
  startedAt: null,
  canResendAt: null,
  failure: null,
  notice: null,
  formNotice: null,
  checking: false,
  resending: false,
  resendClosed: false,
  codeError: null,
  codeKind: null,
});

export function mapFailure(failure: AttemptFailure | undefined, status: string): DirectFailure {
  const category = failure?.category;
  const code = failure?.code || status;
  const retryable = failure?.retryable ?? true;

  if (category === 'insufficient_funds') {
    return { kind: 'insufficient', title: 'Insufficient funds', message: 'Top up your wallet, then try again.', retryable, code };
  }
  if (category === 'timeout' || status === 'expired') {
    return { kind: 'timeout', title: 'No response in time', message: 'The approval prompt expired.', retryable: true, code };
  }
  if (category === 'provider_fault') {
    return {
      kind: 'provider',
      title: 'Couldn’t reach your provider',
      message: 'Try again, or use another method.',
      retryable: true,
      code,
    };
  }
  if (code === 'code_locked') {
    return { kind: 'locked', title: 'Too many wrong codes', message: 'Start again to get a new code.', retryable: true, code };
  }
  if (category === 'declined' || category === 'not_approved' || status === 'canceled' || status === 'cancelled') {
    return {
      kind: 'declined',
      title: 'Payment declined',
      message: 'The request wasn’t approved on your phone.',
      retryable,
      code,
    };
  }
  return {
    kind: 'other',
    title: category === 'invalid' ? 'Check your details' : 'Payment failed',
    message: failure?.message || 'Something went wrong. Please try again.',
    retryable,
    code,
  };
}

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

function clampPoll(ms: number | undefined): number {
  const wanted = ms && ms > 0 ? ms : DEFAULT_POLL_MS;
  return Math.min(Math.max(wanted, MIN_POLL_MS), MAX_POLL_MS);
}

function randomToken(): string {
  const bytes = new Uint8Array(9);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return 'a' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface UseDirectChargeOptions {
  api: DirectChargeApi;
  /** A value, ref or getter: the secret and provider can arrive after the composable is created. */
  sessionSecret?: MaybeRefOrGetter<string | undefined>;
  provider: MaybeRefOrGetter<string>;
  /** Called once, when the server reports `succeeded`. */
  onSuccess: (attempt: PublicAttempt, input: DirectInput | null) => void;
  /** Called when an attempt ends in failure (for the host's `onError`). */
  onFailure?: (failure: DirectFailure) => void;
  /** The clock; tests and the preview freeze it. */
  now?: () => number;
}

export interface DirectCharge {
  /** Reactive. Read it in templates and computeds. */
  state: Readonly<DirectChargeState>;
  start: (input: DirectInput) => Promise<void>;
  /** "I've approved": an immediate status read. */
  check: () => Promise<void>;
  resend: () => Promise<void>;
  submitCode: (code: string) => Promise<void>;
  /** Back to the form, keeping the number. The earlier attempt is still watched. */
  useAnotherNumber: () => void;
  /** "Try again": a new attempt with the same number. */
  retry: () => Promise<void>;
  /** Stop everything and forget the attempt (leaving direct mode, or closing). */
  reset: () => void;
  /** Stop everything for good (the owning scope calls this on dispose). */
  dispose: () => void;
}

interface FollowedAttempt {
  id: string;
  secret: string;
  /** Known final: nothing more to ask. */
  over: boolean;
}

export function useDirectCharge(options: UseDirectChargeOptions): DirectCharge {
  const state = shallowReactive<DirectChargeState>(initialState());

  const now = () => (options.now ?? Date.now)();

  let alive = true;
  let abort = new AbortController();
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;
  let pollFlight: Promise<void> | null = null;
  let lastPollAt = 0;
  let pollErrors = 0;
  let followed: FollowedAttempt | null = null;
  let successSent = false;
  let startLock = false;
  let resendLock = false;
  let codeLock = false;
  /** Token of an unanswered charge, reused if the same input is sent again. */
  let pendingToken: { key: string; token: string } | null = null;

  const patch = (next: Partial<DirectChargeState>) => {
    if (alive) Object.assign(state, next);
  };

  const clearPollTimer = () => {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
  };
  const clearExpiryTimer = () => {
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = null;
  };
  const clearTimers = () => {
    clearPollTimer();
    clearExpiryTimer();
  };

  const failWith = (failure: DirectFailure, extra: Partial<DirectChargeState> = {}) => {
    patch({ phase: 'failed', failure, checking: false, resending: false, ...extra });
    options.onFailure?.(failure);
  };

  // ---- polling ---------------------------------------------------------------------------

  const schedulePoll = (delayMs: number) => {
    clearPollTimer();
    const current = followed;
    if (!current || current.over || !alive) return;
    // A hidden tab does not poll; the visibility handler resumes it.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    pollTimer = setTimeout(() => void pollOnce(), delayMs);
  };

  const armExpiry = () => {
    clearExpiryTimer();
    const { expiresAt, phase } = state;
    if (!expiresAt || (phase !== 'waiting' && phase !== 'code')) return;
    const wait = Math.max(0, expiresAt - now()) + 1_000;
    expiryTimer = setTimeout(() => {
      expiryTimer = null;
      void (async () => {
        // One last read decides: the approval may have landed in the final second.
        await pollOnce(true);
        if (!alive || (state.phase !== 'waiting' && state.phase !== 'code')) return;
        const attempt = state.attempt;
        failWith(mapFailure({ code: 'timeout', category: 'timeout', retryable: true, message: '' }, 'pending'));
        // Keep watching for a late approval.
        schedulePoll(clampPoll(attempt?.poll_after_ms));
      })();
    }, wait);
  };

  /**
   * Fold a public attempt view into the state. `resume` lets the view move a failed
   * screen back to waiting (a resend that succeeded).
   */
  const applyAttempt = (view: PublicAttempt, opts: { resume?: boolean; fresh?: boolean } = {}) => {
    const s = state;
    const current = followed;
    if (current && view.id !== current.id) return;

    const at = now();
    if (view.status === 'succeeded') {
      if (current) current.over = true;
      clearTimers();
      patch({ phase: 'succeeded', attempt: view, checking: false, resending: false, failure: null, notice: null });
      if (!successSent) {
        successSent = true;
        options.onSuccess(view, state.input);
      }
      return;
    }

    if (FINAL_FAILED.has(view.status)) {
      if (current) current.over = true;
      clearTimers();
      // On the form (after "Use another number") or already on the timeout screen: say nothing new.
      if (s.phase === 'idle' || (s.phase === 'failed' && !opts.resume)) {
        patch({ attempt: view, checking: false });
        return;
      }
      failWith(mapFailure(view.failure, view.status), { attempt: view, notice: null, formNotice: null });
      return;
    }

    // Still live.
    const action = view.next_action;
    const wantsCode = action?.type === 'otp' || action?.type === 'voucher';
    const startedAt = opts.fresh ? at : s.startedAt ?? at;
    const expiresAt =
      parseTime(action?.expires_at) ?? (opts.fresh || !s.expiresAt ? startedAt + DEFAULT_PROMPT_WINDOW_MS : s.expiresAt);
    const canResendAt =
      parseTime(action?.can_resend_at) ?? (opts.fresh || !s.canResendAt ? startedAt + RESEND_COOLDOWN_MS : s.canResendAt);

    const base: Partial<DirectChargeState> = { attempt: view, startedAt, expiresAt, canResendAt, checking: false };
    const mayMove =
      s.phase === 'starting' || s.phase === 'waiting' || s.phase === 'code' || s.phase === 'submitting' || opts.resume;
    if (!mayMove) {
      // Background watch while the shopper is on the form or the timeout screen.
      patch(base);
      return;
    }
    if (wantsCode) {
      const kind = action?.type === 'voucher' ? 'voucher' : 'otp';
      patch({
        ...base,
        phase: 'code',
        codeKind: kind,
        failure: null,
        codeError: s.phase === 'submitting' && s.codeKind === kind ? s.codeError : null,
      });
    } else {
      patch({ ...base, phase: 'waiting', failure: null, codeKind: null, codeError: null });
    }
    armExpiry();
  };

  const pollOnce = (force = false): Promise<void> => {
    const current = followed;
    if (!current || current.over || !alive) return Promise.resolve();
    if (pollFlight) return pollFlight;
    if (force && now() - lastPollAt < MIN_FORCE_GAP_MS) {
      schedulePoll(MIN_FORCE_GAP_MS);
      return Promise.resolve();
    }

    const handlePollError = (error: DirectApiError) => {
      if (error.code === 'aborted') return;
      if (error.status === 404 || error.status === 401) {
        current.over = true;
        failWith({
          kind: 'other',
          title: 'Payment not found',
          message: 'We lost track of this payment. Start again.',
          retryable: true,
          code: error.code,
        });
        return;
      }
      pollErrors += 1;
      if (pollErrors >= 3 && !state.notice) patch({ notice: COPY.offline });
      const backoff = error.retryAfterMs ?? Math.min(DEFAULT_POLL_MS * 2 ** (pollErrors - 1), MAX_POLL_MS);
      schedulePoll(Math.max(backoff, MIN_POLL_MS));
    };

    const run = (async () => {
      lastPollAt = now();
      const result = await options.api.status(current.id, current.secret, { signal: abort.signal });
      if (!alive || followed !== current) return;

      if (result.error) {
        handlePollError(result.error);
        return;
      }
      pollErrors = 0;
      if (state.notice === COPY.offline) patch({ notice: null });
      applyAttempt(result.data);

      // Past the grace, an attempt nobody is waiting on any more is left to the webhook.
      if (state.expiresAt && now() > state.expiresAt + WATCH_GRACE_MS && state.phase !== 'waiting' && state.phase !== 'code') {
        current.over = true;
        return;
      }
      if (!current.over) schedulePoll(clampPoll(result.data.poll_after_ms));
    })().finally(() => {
      pollFlight = null;
    });
    pollFlight = run;
    return run;
  };

  // Pause while the tab is hidden; read straight away when it comes back.
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      clearPollTimer();
      return;
    }
    if (followed && !followed.over) void pollOnce(true);
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);

  const dispose = () => {
    alive = false;
    abort.abort();
    clearTimers();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  };
  // Abort everything when the owning component unmounts.
  if (getCurrentScope()) onScopeDispose(dispose);

  // ---- actions ---------------------------------------------------------------------------

  const adoptAttempt = (view: PublicAttempt, fallbackSecret?: string): boolean => {
    const secret = view.client_secret || (followed?.id === view.id ? followed.secret : fallbackSecret) || '';
    // A final answer needs no secret to be followed: there is nothing left to ask.
    const final = view.status === 'succeeded' || FINAL_FAILED.has(view.status);
    if (!secret && !final) return false;
    followed = { id: view.id, secret, over: final };
    pollErrors = 0;
    return true;
  };

  const start = async (input: DirectInput) => {
    const sessionSecret = toValue(options.sessionSecret);
    const provider = toValue(options.provider);
    if (startLock || !sessionSecret) return;
    startLock = true;
    const from = state.phase;
    const key = `${input.phone}|${input.network ?? ''}`;
    const token = pendingToken?.key === key ? pendingToken.token : randomToken();
    pendingToken = { key, token };
    // A re-send from the failure panel keeps that panel until the answer arrives.
    patch({ phase: from === 'failed' ? 'failed' : 'starting', input, formNotice: null, notice: null, checking: false });

    try {
      const result = await options.api.charge(
        sessionSecret,
        { method: 'mobile_money', provider, phone: input.phone, network: input.network, attempt_token: token },
        { signal: abort.signal },
      );
      if (!alive) return;

      if (result.error) {
        const e = result.error;
        if (e.code === 'aborted') return;
        if (!e.unknownOutcome) pendingToken = null;
        // Back where the shopper pressed the button: the failure panel keeps its place, the form its own line.
        const say = (message: string) =>
          patch(from === 'failed' ? { phase: 'failed', notice: message } : { phase: 'idle', formNotice: message });

        if (e.code === 'attempt_pending') {
          say(e.message);
          if (e.canResendAt) patch({ canResendAt: parseTime(e.canResendAt) });
          // The earlier prompt is still live: keep following it.
          if (followed && !followed.over) schedulePoll(MIN_POLL_MS);
          return;
        }
        if (e.code === 'charge_limit_reached') {
          failWith({
            kind: 'exhausted',
            title: 'No more attempts',
            message: 'You’ve used every attempt for this payment.',
            retryable: false,
            code: e.code,
          });
          return;
        }
        if (e.code === 'no_providers_available' || e.code === 'provider_error') {
          // Every route failed before a prompt went out: nothing was sent, so it is safe to try again.
          failWith({
            kind: 'provider',
            title: 'Couldn’t reach your provider',
            message: 'Try again, or use another method.',
            retryable: true,
            code: e.code,
          });
          return;
        }
        if (e.status === 404 || e.status === 401 || e.status === 410 || e.code === 'checkout_session_closed') {
          failWith({
            kind: 'other',
            title: e.status === 410 ? 'Checkout expired' : 'Checkout unavailable',
            message: e.status === 410 ? 'This checkout has expired. Start again.' : e.message,
            retryable: false,
            code: e.code,
          });
          return;
        }
        say(e.unknownOutcome ? 'We couldn’t confirm the prompt was sent. Check your connection and try again.' : e.message);
        return;
      }

      pendingToken = null;
      const view = result.data;
      if (view.next_action?.type === 'redirect') {
        failWith({
          kind: 'other',
          title: 'Use another method',
          message: 'This method can’t be paid here. Choose another.',
          retryable: false,
          code: 'redirect_not_supported',
        });
        return;
      }
      if (!adoptAttempt(view)) {
        failWith({
          kind: 'other',
          title: 'Payment failed',
          message: 'Something went wrong. Please try again.',
          retryable: true,
          code: 'missing_secret',
        });
        return;
      }
      successSent = false;
      clearTimers();
      patch({ resendClosed: false, notice: null, formNotice: null });
      applyAttempt(view, { resume: true, fresh: true });
      if (!followed?.over) schedulePoll(clampPoll(view.poll_after_ms));
    } finally {
      startLock = false;
    }
  };

  const check = async () => {
    if (state.checking || (state.phase !== 'waiting' && state.phase !== 'code')) return;
    patch({ checking: true, notice: COPY.checking });
    await pollOnce(true);
    if (!alive) return;
    if (state.phase === 'waiting') {
      patch({ checking: false, notice: pollErrors > 0 ? COPY.unreachable : COPY.notYet });
    } else {
      patch({ checking: false });
    }
  };

  const resend = async () => {
    const current = followed;
    if (!current || resendLock || state.resendClosed) return;
    if (state.phase !== 'waiting' && state.phase !== 'failed' && state.phase !== 'code') return;
    resendLock = true;
    patch({ resending: true, notice: null });

    try {
      const result = await options.api.resend(current.id, current.secret, { signal: abort.signal });
      if (!alive) return;

      if (result.error) {
        const e = result.error;
        if (e.code === 'aborted') return;
        if (e.code === 'attempt_pending') {
          patch({ resending: false, notice: e.message, canResendAt: parseTime(e.canResendAt) ?? state.canResendAt });
          // Still live: the answer may arrive any second.
          if (!current.over) schedulePoll(MIN_POLL_MS);
          return;
        }
        if (e.code === 'resend_cooldown') {
          patch({ resending: false, notice: e.message, canResendAt: now() + (e.retryAfterMs ?? RESEND_COOLDOWN_MS) });
          return;
        }
        if (e.code === 'resend_limit_reached' || e.code === 'resend_not_supported') {
          patch({ resending: false, resendClosed: true, notice: e.message });
          return;
        }
        if (e.code === 'charge_limit_reached') {
          patch({ resending: false });
          failWith({
            kind: 'exhausted',
            title: 'No more attempts',
            message: 'You’ve used every attempt for this payment.',
            retryable: false,
            code: e.code,
          });
          return;
        }
        if (e.status === 404) {
          current.over = true;
          failWith({
            kind: 'other',
            title: 'Payment not found',
            message: 'We lost track of this payment. Start again.',
            retryable: true,
            code: e.code,
          });
          return;
        }
        patch({
          resending: false,
          notice: e.unknownOutcome ? 'Couldn’t send a new prompt. Check your connection and try again.' : e.message,
        });
        return;
      }

      const view = result.data;
      const next = view.id !== current.id;
      if (next && !adoptAttempt(view)) {
        patch({ resending: false, notice: 'Couldn’t send a new prompt. Try again.' });
        return;
      }
      clearTimers();
      patch({ resending: false, notice: COPY.newPrompt, formNotice: null, failure: null });
      applyAttempt(view, { resume: true, fresh: true });
      if (!followed?.over) schedulePoll(clampPoll(view.poll_after_ms));
    } finally {
      resendLock = false;
    }
  };

  const submitCode = async (code: string) => {
    const current = followed;
    const kind = state.codeKind;
    if (!current || !kind || codeLock || state.phase !== 'code') return;
    codeLock = true;
    patch({ phase: 'submitting', codeError: null });

    try {
      const result = await options.api.action(current.id, current.secret, { type: kind, code }, { signal: abort.signal });
      if (!alive) return;

      if (result.error) {
        const e = result.error;
        if (e.code === 'aborted') return;
        if (e.code === 'invalid_code') {
          const left = e.attemptsLeft;
          patch({
            phase: 'code',
            codeError:
              typeof left === 'number' && left > 0 && left <= 2
                ? `That code wasn’t accepted. ${left} ${left === 1 ? 'try' : 'tries'} left.`
                : 'That code wasn’t accepted.',
          });
          return;
        }
        if (e.code === 'attempt_locked') {
          current.over = true;
          failWith({
            kind: 'locked',
            title: 'Too many wrong codes',
            message: 'Start again to get a new code.',
            retryable: true,
            code: e.code,
          });
          return;
        }
        if (e.code === 'action_not_allowed') {
          // Not waiting for a code any more: the status read says where it went.
          patch({ phase: 'waiting', codeKind: null });
          await pollOnce(true);
          return;
        }
        if (e.status === 404) {
          current.over = true;
          failWith({
            kind: 'other',
            title: 'Payment not found',
            message: 'We lost track of this payment. Start again.',
            retryable: true,
            code: e.code,
          });
          return;
        }
        patch({ phase: 'code', codeError: e.unknownOutcome ? 'Couldn’t reach Reevit. Try again.' : e.message });
        return;
      }

      applyAttempt(result.data);
      if (!current.over) schedulePoll(clampPoll(result.data.poll_after_ms));
    } finally {
      codeLock = false;
    }
  };

  const useAnotherNumber = () => {
    // The earlier prompt may still be live, so it stays watched.
    patch({ phase: 'idle', failure: null, notice: null, formNotice: null, checking: false, codeError: null, codeKind: null });
    clearExpiryTimer();
  };

  const retry = async () => {
    const input = state.input;
    if (input) await start(input);
  };

  const reset = () => {
    abort.abort();
    abort = new AbortController();
    clearTimers();
    followed = null;
    pollFlight = null;
    pendingToken = null;
    successSent = false;
    startLock = false;
    resendLock = false;
    codeLock = false;
    pollErrors = 0;
    patch(initialState());
  };

  return { state, start, check, resend, submitCode, useAnotherNumber, retry, reset, dispose };
}
