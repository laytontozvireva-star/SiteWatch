# @tozvi/sitewatch

SiteWatch browser error monitoring SDK.

## Install

```sh
npm install @tozvi/sitewatch
```

## Start monitoring

### Guided setup (React and Vite)

From your website project folder, run:

```sh
npm install @tozvi/sitewatch
npx sitewatch init
```

The setup tool asks for your SiteWatch project key, detects a supported `src/main.*`
or `src/index.*` entry file, and adds the integration once. It never overwrites an
existing SiteWatch configuration.

### Manual setup

```js
import { initSiteWatch } from "@tozvi/sitewatch";

initSiteWatch({
  apiKey: "YOUR_SITEWATCH_PROJECT_KEY",
  endpoint: "https://sitewatch-sigma.vercel.app/api/errors",
});
```

Initialize once in your app entry point. The SDK captures uncaught browser errors,
unhandled promise rejections, and failed `fetch` requests. It sends the page URL,
browser user agent, message, and available stack trace to SiteWatch. It does not
capture request or response bodies.

`initSiteWatch` returns a cleanup function for apps that need to stop monitoring.
The package is browser-only; calls made during server rendering do nothing.
