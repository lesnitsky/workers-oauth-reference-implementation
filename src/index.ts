import { Hono } from "hono";
import { poweredBy } from "hono/powered-by";

const app = new Hono();

app.use("*", poweredBy());

app.get("/", (c) => {
  return c.html(`
<h1>Hello World</h1>
<a href="/login">Login</a>
`);
});

app.get("/login", (c) => {
  return c.html(`
<h1>Login</h1>
<div><a href="/auth/google">Login with Google</a></div>
<div><a href="/auth/github">Login with GitHub</a></div>
`);
});

app.get("/auth/:provider", (c) => {
  const provider = c.req.param("provider");

  switch (provider) {
    case "github": {
      const url = new URL("https://github.com/login/oauth/authorize");
      url.searchParams.append("scope", "user:email");
      url.searchParams.append("client_id", c.env["GITHUB_CLIENT_ID"]);

      return c.redirect(url.toString());
    }

    case "google": {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.append("scope", "email");
      url.searchParams.append("client_id", c.env["GOOGLE_CLIENT_ID"]);
      url.searchParams.append("response_type", "code");
      url.searchParams.append(
        "redirect_uri",
        "http://localhost:8787/oauth/google/callback"
      );

      return c.redirect(url.toString());
    }

    default: {
      return c.notFound();
    }
  }
});

app.get("/oauth/:provider/callback", async (c) => {
  const provider = c.req.param("provider");

  switch (provider) {
    case "github": {
      const code = c.req.query("code");

      if (!code) {
        return c.html(`<h1>Invalid code</h1>`);
      }

      const url = new URL("https://github.com/login/oauth/access_token");

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: c.env["GITHUB_CLIENT_ID"],
          client_secret: c.env["GITHUB_CLIENT_SECRET"],
          code,
        }),
      });

      // contains access_token
      // access_token could be used to make api requests to get profile info
      const data = await res.json();

      return c.json(data);
    }

    case "google": {
      const code = c.req.query("code");

      if (!code) {
        return c.html(`<h1>Invalid code</h1>`);
      }

      const url = new URL("https://oauth2.googleapis.com/token");

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: c.env["GOOGLE_CLIENT_ID"],
          client_secret: c.env["GOOGLE_CLIENT_SECRET"],
          code,
          grant_type: "authorization_code",
          redirect_uri: "http://localhost:8787/oauth/google/callback",
        }),
      });

      // contains access_token
      // access_token could be used to make api requests to get profile info
      const data = await res.json();

      return c.json(data);
    }

    default: {
      return c.notFound();
    }
  }
});

export default app;
