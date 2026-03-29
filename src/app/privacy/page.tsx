import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "ZedImpact Privacy Policy — how we collect, use, and protect your data.",
  openGraph: {
    title: "Privacy Policy | ZedImpact",
    description: "How ZedImpact collects, uses, and protects your data.",
  },
};

export default function PrivacyPage() {
  return (
    <PageShell
      label="Legal"
      headline="Privacy Policy"
      description="Last updated: January 1, 2025"
    >
      <div className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl">
        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us, such as when you
          create an account, subscribe to our newsletter, or contact us for
          support. This may include:
        </p>
        <ul>
          <li>Name, email address, and password</li>
          <li>Organization name, address, and tax ID number</li>
          <li>Payment information (processed securely via Stripe)</li>
          <li>Communication preferences</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve our services</li>
          <li>Process transactions and send related information</li>
          <li>Send technical notices, updates, and support messages</li>
          <li>Respond to your comments and questions</li>
          <li>Monitor and analyze usage patterns to improve our platform</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>
          We do not sell, trade, or otherwise transfer your personally
          identifiable information to third parties. We may share your
          information with trusted third-party service providers who assist us
          in operating our platform, conducting our business, or serving you,
          as long as those parties agree to keep this information confidential.
        </p>

        <h2>4. Data Security</h2>
        <p>
          We implement appropriate technical and organizational security
          measures to protect your personal information against unauthorized
          access, alteration, disclosure, or destruction. All data is
          transmitted over SSL/TLS encryption.
        </p>

        <h2>5. Data Retention</h2>
        <p>
          We retain your personal information for as long as your account is
          active or as needed to provide you services. You may request deletion
          of your data at any time by contacting us at{" "}
          <a href="mailto:privacy@zedimpact.com">privacy@zedimpact.com</a>.
        </p>

        <h2>6. Cookies</h2>
        <p>
          We use cookies and similar tracking technologies to track activity on
          our service and hold certain information. You can instruct your
          browser to refuse all cookies or to indicate when a cookie is being
          sent.
        </p>

        <h2>7. Third-Party Services</h2>
        <p>
          Our platform integrates with third-party services including Stripe
          (payments), Clerk (authentication), and Resend (email). Each of these
          services has its own privacy policy governing the use of your data.
        </p>

        <h2>8. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to processing of your data</li>
          <li>Data portability</li>
        </ul>

        <h2>9. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at{" "}
          <a href="mailto:privacy@zedimpact.com">privacy@zedimpact.com</a> or
          via our <a href="/contact">contact page</a>.
        </p>
      </div>
    </PageShell>
  );
}
