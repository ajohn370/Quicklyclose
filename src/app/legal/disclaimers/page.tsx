import { LegalPageContent } from '@/components/features/legal-page-content';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disclaimers - QuicklyClose',
  description: 'Legal disclaimers for QuicklyClose.com.',
};

export default function DisclaimersPage() {
  return (
    <LegalPageContent title="Legal Disclaimers">
      <h2>No Guarantees of Sale or Timeline</h2>
      <p>QuicklyClose.com uses data-driven tools and investor networks to facilitate fast home sales, but results vary. Property conditions, location, and market demand affect final outcomes. We do not guarantee a sale within 7 days or at a particular price.</p>

      <h2>Use of AI</h2>
      <p>AI valuation tools are for informational purposes only and do not constitute a formal appraisal.</p>

      <h2>Not Legal or Financial Advice</h2>
      <p>All content on this website is for general information only and does not constitute legal, financial, or real estate advice.</p>

      <h2>Licensed Real Estate Professionals</h2>
      <p>QuicklyClose.com includes team members who are licensed real estate professionals. Adedapo Orederu is a Licensed Real Estate Salesperson in New York. Anthony John is a Licensed Real Estate Salesperson in Florida. Their licensed services are provided independently and not as part of QuicklyClose.com’s business operations.</p>
    </LegalPageContent>
  );
}