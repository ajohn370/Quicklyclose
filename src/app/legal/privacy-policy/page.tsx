import { LegalPageContent } from '@/components/features/legal-page-content';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - QuicklyClose',
  description: 'Read the Privacy Policy for QuicklyClose.com.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageContent title="Privacy Policy">
      <p><strong>Effective Date:</strong> July 26, 2024</p>
      <p>QuicklyClose LLC (“we,” “our,” or “us”) operates QuicklyClose.com to help homeowners quickly connect with cash buyers and real estate investors. Your privacy is important to us.</p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>Contact Information (name, phone, email, address)</li>
        <li>Property Details (condition, ownership status, sale timeline)</li>
        <li>Device/Usage Data (IP address, browser, referring site)</li>
        <li>Cookies & Pixels from third-party platforms (Facebook Pixel, Google Analytics)</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide valuation and connect you with potential buyers</li>
        <li>To contact you regarding your property inquiry</li>
        <li>For marketing and retargeting</li>
        <li>To improve our services</li>
      </ul>

      <h2>3. How We Share Information</h2>
      <p>We may share your data with:</p>
      <ul>
        <li>Real estate investors interested in your property</li>
        <li>Third-party service providers (analytics, CRM, hosting)</li>
        <li>Legal authorities if required by law</li>
      </ul>
      <p>We do not sell your personal data to unrelated third parties.</p>

      <h2>4. Your Rights</h2>
      <ul>
        <li>You may request to access, correct, or delete your data.</li>
        <li>To opt out of marketing, click “unsubscribe” or contact us.</li>
      </ul>

      <h2>5. Cookies and Tracking</h2>
      <p>We use cookies and similar tracking to enhance your experience and analyze site traffic. You can manage cookies via your browser settings.</p>

      <h2>6. Security</h2>
      <p>We use commercially reasonable safeguards to protect your data.</p>

      <h2>7. Children</h2>
      <p>Our site is not intended for users under 18. We do not knowingly collect their information.</p>

      <h2>8. Contact Us</h2>
      <p>Email: support@quicklyclose.com<br />Address: [Insert Business Address Here]</p>

      <h2>9. Licensing Disclosure</h2>
      <p>Adedapo Orederu is a Licensed Real Estate Salesperson in the State of New York. Anthony John is a Licensed Real Estate Salesperson in the State of Florida. QuicklyClose.com operates as a real estate marketing and lead generation platform and is not a licensed real estate brokerage. Any licensed services are performed independently by the respective individuals in their licensed jurisdictions.</p>
    </LegalPageContent>
  );
}