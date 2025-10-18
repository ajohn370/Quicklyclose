
import { test } from '@playwright/test';
import { expect } from '@playwright/test';

test('PortalAuthTest_2025-10-12', async ({ page, context }) => {
  
    // Navigate to URL
    await page.goto('https://quickly-close-app.vercel.app/seller-portal');

    // Take screenshot
    await page.screenshot({ path: 'seller-portal-initial.png', { fullPage: true } });

    // Click element
    await page.click('button:has-text("Seller Login")');

    // Take screenshot
    await page.screenshot({ path: 'seller-login-modal.png' });

    // Fill input field
    await page.fill('input[type="email"]', 'eonuoha009@gmail.com');

    // Fill input field
    await page.fill('input[type="password"]', '#Adminkay009');

    // Take screenshot
    await page.screenshot({ path: 'seller-credentials-filled.png' });

    // Click element
    await page.click('button[type="submit"]');

    // Click element
    await page.click('.relative .z-10 button[type="submit"]');

    // Take screenshot
    await page.screenshot({ path: 'seller-login-current-state.png' });

    // Take screenshot
    await page.screenshot({ path: 'seller-login-after-submit.png' });

    // Take screenshot
    await page.screenshot({ path: 'seller-portal-after-login-attempt.png', { fullPage: true } });

    // Navigate to URL
    await page.goto('https://quickly-close-app.vercel.app/investor-portal');

    // Take screenshot
    await page.screenshot({ path: 'investor-portal-initial.png', { fullPage: true } });

    // Click element
    await page.click('button:has-text("Sign In")');

    // Take screenshot
    await page.screenshot({ path: 'investor-login-modal.png' });

    // Fill input field
    await page.fill('input[type="email"]', 'eonuoha009@gmail.com');

    // Fill input field
    await page.fill('input[type="password"]', '#Adminkay009');

    // Take screenshot
    await page.screenshot({ path: 'investor-credentials-filled.png' });

    // Take screenshot
    await page.screenshot({ path: 'investor-portal-after-login.png', { fullPage: true } });

    // Navigate to URL
    await page.goto('https://quickly-close-app.vercel.app/seller-portal');

    // Take screenshot
    await page.screenshot({ path: 'seller-portal-for-property-test.png', { fullPage: true } });

    // Fill input field
    await page.fill('input[id="name"]', 'John Test Seller');

    // Fill input field
    await page.fill('input[id="email"]', 'johntest@example.com');

    // Fill input field
    await page.fill('input[id="phone"]', '555-123-4567');

    // Take screenshot
    await page.screenshot({ path: 'seller-info-filled.png' });

    // Click element
    await page.click('button:has-text("Continue")');

    // Take screenshot
    await page.screenshot({ path: 'property-details-form.png' });

    // Fill input field
    await page.fill('input[id="address"]', '123 Test Street');

    // Fill input field
    await page.fill('input[id="city"]', 'Test City');

    // Fill input field
    await page.fill('input[id="state"]', 'CA');

    // Fill input field
    await page.fill('input[id="zip"]', '90210');

    // Fill input field
    await page.fill('input[id="bedrooms"]', '3');

    // Fill input field
    await page.fill('input[id="bathrooms"]', '2');

    // Fill input field
    await page.fill('input[id="sqft"]', '1500');

    // Take screenshot
    await page.screenshot({ path: 'property-details-filled.png' });

    // Click element
    await page.click('button:has-text("Submit Property")');

    // Take screenshot
    await page.screenshot({ path: 'property-submission-success.png', { fullPage: true } });
});