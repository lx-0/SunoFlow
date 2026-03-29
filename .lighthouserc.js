/** @type {import('@lhci/cli').LighthouseRcConfig} */
module.exports = {
  ci: {
    collect: {
      // Pages to audit — unauthenticated routes only (auth-gated pages
      // require a running server with seeded session cookies, which is a
      // separate workflow concern).
      url: [
        "http://localhost:3000/en",          // landing page
        "http://localhost:3000/en/login",    // login page
        "http://localhost:3000/en/pricing",  // pricing page
      ],
      numberOfRuns: 3,
      settings: {
        // Use desktop preset for consistent results; adjust to "mobile" if
        // targeting mobile Lighthouse scores.
        preset: "desktop",
        // Throttle CPU to simulate a mid-range device (4x slowdown).
        throttlingMethod: "simulate",
        // Skip PWA audits — app requires authentication for full PWA flow.
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      },
    },
    assert: {
      preset: "lighthouse:no-pwa",
      assertions: {
        // Performance — target 90+ on all audited pages
        "categories:performance": ["error", { minScore: 0.9 }],
        // Accessibility — enforce WCAG compliance
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        // Best practices
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        // SEO
        "categories:seo": ["warn", { minScore: 0.9 }],

        // Core Web Vitals thresholds (desktop)
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        "interactive": ["warn", { maxNumericValue: 3500 }],

        // Flag render-blocking resources
        "render-blocking-resources": ["warn", { maxLength: 0 }],

        // Image optimisation
        "uses-optimized-images": ["warn", { maxLength: 0 }],
        "uses-responsive-images": ["warn", { maxLength: 0 }],
        "uses-webp-images": "off",  // Next.js handles format negotiation automatically
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
