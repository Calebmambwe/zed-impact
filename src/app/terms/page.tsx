import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "ZedImpact Terms of Service — the rules and guidelines governing use of our platform.",
  openGraph: {
    title: "Terms of Service | ZedImpact",
    description: "The rules and guidelines governing use of ZedImpact.",
  },
};

export default function TermsPage() {
  return (
    <PageShell
      label="Legal"
      headline="Terms of Service"
      description="Last updated: January 1, 2025"
    >
      <div className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using ZedImpact (&#34;the Service&#34;), you agree to be
          bound by these Terms of Service. If you do not agree to these terms,
          please do not use our Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          ZedImpact provides nonprofit management software as a service
          (SaaS), including but not limited to donation management, donor CRM,
          event management, email campaigns, sponsorship management, and
          reporting tools.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          To use the Service, you must create an account. You are responsible
          for maintaining the confidentiality of your account credentials and
          for all activities that occur under your account. You agree to:
        </p>
        <ul>
          <li>Provide accurate and complete registration information</li>
          <li>Maintain and promptly update your account information</li>
          <li>Notify us immediately of any unauthorized use of your account</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe on the intellectual property rights of others</li>
          <li>Transmit harmful, offensive, or malicious content</li>
          <li>Engage in fraudulent activities or misrepresent your organization</li>
          <li>Attempt to gain unauthorized access to the Service or its systems</li>
        </ul>

        <h2>5. Payment Terms</h2>
        <p>
          Subscription fees are billed in advance on a monthly or annual basis.
          All fees are non-refundable except as required by law or as expressly
          stated in our refund policy. We reserve the right to modify pricing
          with 30 days&#39; notice.
        </p>

        <h2>6. Data and Privacy</h2>
        <p>
          Your use of the Service is also governed by our{" "}
          <a href="/privacy">Privacy Policy</a>. You retain ownership of all
          data you input into the Service. By using the Service, you grant us a
          limited license to process your data for the purpose of providing the
          Service.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          The Service and its original content, features, and functionality are
          owned by ZedImpact and are protected by international copyright,
          trademark, and other intellectual property laws.
        </p>

        <h2>8. Termination</h2>
        <p>
          We may terminate or suspend your account immediately, without prior
          notice, for conduct that we determine violates these Terms or is
          harmful to other users, third parties, or the integrity of the
          Service.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, ZedImpact shall not be liable
          for any indirect, incidental, special, consequential, or punitive
          damages resulting from your use of the Service.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will
          provide at least 30 days&#39; notice before changes take effect. Continued
          use of the Service after the effective date constitutes acceptance of
          the new Terms.
        </p>

        <h2>11. Contact</h2>
        <p>
          For questions about these Terms, contact us at{" "}
          <a href="mailto:legal@zedimpact.com">legal@zedimpact.com</a>.
        </p>
      </div>
    </PageShell>
  );
}
