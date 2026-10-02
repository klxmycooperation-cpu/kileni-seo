type CsrfTokenLoader = () => Promise<string>;

/**
 * `/api/csrf` both returns a token and replaces its matching HttpOnly cookie.
 * Joining concurrent requests keeps the body token and cookie from the same
 * response, so a late initial request cannot invalidate a form submission.
 */
export function createCsrfTokenStore(loadToken: CsrfTokenLoader) {
  let token = "";
  let pending: Promise<string> | undefined;

  function request(replace: boolean): Promise<string> {
    if (pending) return pending;
    if (!replace && token) return Promise.resolve(token);

    pending = loadToken()
      .then((nextToken) => {
        if (!nextToken) throw new Error("CSRF token unavailable");
        token = nextToken;
        return nextToken;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  }

  return {
    get: () => request(false),
    renew: () => request(true),
  };
}
