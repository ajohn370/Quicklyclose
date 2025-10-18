import { LegalPageContent } from '@/components/features/legal-page-content';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use - QuicklyClose',
  description: 'Read the Terms of Use for QuicklyClose.com.',
};

export default function TermsOfUsePage() {
  return (
    <LegalPageContent title="Terms of Use">
      <p><strong>Effective Date:</strong> July 26, 2024</p>
      <p>Welcome to QuicklyClose.com (“Site”). By accessing this Site, you agree to these Terms of Use.</p>

      <h2>1. Use of Site</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Misrepresent any property information</li>
        <li>Use bots or scrapers to collect data</li>
        <li>Use the platform for fraudulent purposes</li>
      </ul>

      <h2>2. No Guarantee of Sale</h2>
      <p>QuicklyClose.com helps match motivated sellers with cash buyers. We do not guarantee a sale, specific pricing, or closing within a certain number of days. AI valuation results are estimates only.</p>

      <h2>3. Not a Brokerage</h2>
      <p>Unless explicitly stated, QuicklyClose.com is not a licensed real estate brokerage. We are a lead generation and marketing platform. We connect sellers with third-party buyers or investors who operate independently.</p>

      <h2>4. Intellectual Property</h2>
      <p>All content, branding, and visuals are the property of QuicklyClose LLC. You may not reproduce or distribute any content without permission.</p>

      <h2>5. Limitation of Liability</h2>
      <p>We are not liable for any damages resulting from use of this site, inability to close, or decisions made based on AI evaluations.</p>

      <h2>6. Changes</h2>
      <p>We may update these Terms at any time. Continued use constitutes acceptance of the latest version.</p>

      <h2>7. Licensing Disclosure</h2>
      <p>Adedapo Orederu is a Licensed Real Estate Salesperson in the State of New York. Anthony John is a Licensed Real Estate Salesperson in the State of Florida. QuicklyClose.com is not a real estate brokerage. Licensed real estate activity is performed independently by the respective individuals in accordance with their state licensing laws.</p>
    </LegalPageContent>
  );
}