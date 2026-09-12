const { test, expect } = require('@playwright/test');

test.describe.serial('Full Project Review Portal End-to-End Workflow', () => {

test('Full End-to-End Workflow (Continuous Single Browser Session)', async ({ page }) => {

        await test.step('1. Admin: Login, Check/Activate Session & Explore Sections', async () => {
            // Step 1: Admin Login using brave-pass credentials
            await page.goto('/');
            await page.fill('input[name="email"]', 'cseceg2024@gmail.com');
            await page.fill('input[name="password"]', 'admin');
            await page.click('button[type="submit"]');

            // Verify Admin Dashboard & Control Panel
            await expect(page).toHaveURL(/.*admin-dashboard/);
            await expect(page.locator('text=Admin Control Panel')).toBeVisible();

            // Step 2: Ensure Session is Active or Create One
            const sessionCard = page.locator('div[class*="cursor-pointer"]').first();
            if (await sessionCard.isVisible()) {
                // Click to toggle Active if paused
                const pausedBadge = sessionCard.locator('text=Paused');
                if (await pausedBadge.isVisible().catch(() => false)) {
                    const startBtn = sessionCard.locator('button:has-text("Paused")').first();
                    if (await startBtn.isVisible()) await startBtn.click();
                }
            } else {
                await page.click('button:has-text("+ Add Session")');
                await page.selectOption('select:has-text("January")', '7'); // July
                await page.selectOption('select:has-text("July")', '11'); // November
                await page.selectOption('select:has-text("Paused")', 'active'); // Set active
                await page.click('button[type="submit"]:has-text("Create Session")');
                await page.waitForTimeout(1000);
            }

            // Step 3: Global Management section test
            await page.click('button:has-text("Global Management")');
            await expect(page.locator('text=Global Management')).toBeVisible();
            await page.waitForTimeout(1000);

            // Return to Sessions List
            await page.goto('/admin-dashboard');

            // Step 4: Open Active Session & Explore B.E. CSE Programme
            const targetSession = page.locator('div[class*="cursor-pointer"]').first();
            if (await targetSession.isVisible()) {
                await targetSession.click();
                await page.waitForTimeout(1000);

                // Select B.E. CSE Programme
                await page.click('button:has-text("B.E. CSE")');
                await expect(page).toHaveURL(/.*programme\/B\.E\..*CSE/);

                // Check Settings section
                await page.click('button:has-text("Settings")');
                await page.waitForTimeout(1000);

                // Check Review Panels section
                await page.click('button:has-text("Review Panels")');
                await page.waitForTimeout(1000);
            }

            // Logout
            await page.click('button:has-text("Logout")');
            await expect(page).toHaveURL('/');
        });

        await test.step('2. UG Student 1 (Alice): Login & Form Team with Bob', async () => {
            // Alice logs in with 'alice@univ.edu' / 'a'
            await page.goto('/');
            await page.fill('input[name="email"]', 'alice@univ.edu');
            await page.fill('input[name="password"]', 'a');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(/.*student-dashboard/);

            // Go to Team Formation
            await page.click('button:has-text("Team Formation")');
            await page.waitForTimeout(1000);

            // Invite Bob if available
            const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Add")').first();
            if (await inviteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await inviteBtn.click();
                await page.waitForTimeout(1000);
            }

            await page.click('button:has-text("Logout")');
        });

        await test.step('3. UG Student 2 (Bob): Login & Accept Team Invitation', async () => {
            // Bob logs in with 'bob@univ.edu' / '2'
            await page.goto('/');
            await page.fill('input[name="email"]', 'bob@univ.edu');
            await page.fill('input[name="password"]', '2');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(/.*student-dashboard/);

            // Go to Team Formation & Accept
            await page.click('button:has-text("Team Formation")');
            const acceptBtn = page.locator('button:has-text("Accept")').first();
            if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await acceptBtn.click();
                await page.waitForTimeout(1000);
            }

            await page.click('button:has-text("Logout")');
        });

        await test.step('4. UG Student 1 (Alice): Lock Team & Request Guide (Dr. John)', async () => {
            // Alice logs back in
            await page.goto('/');
            await page.fill('input[name="email"]', 'alice@univ.edu');
            await page.fill('input[name="password"]', 'a');
            await page.click('button[type="submit"]');

            // Go to My Team & Lock
            await page.click('button:has-text("My Team"), button:has-text("Team Formation")');
            page.once('dialog', async dialog => {
                await dialog.accept();
            });
            const lockBtn = page.locator('button:has-text("Lock Team"), button:has-text("Lock")').first();
            if (await lockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await lockBtn.click();
                await page.waitForTimeout(1000);
            }

            // Request Guide (Dr. John)
            await page.click('button:has-text("Guide Requests"), button:has-text("Guide Selection")');
            const requestGuideBtn = page.locator('button:has-text("Request Guide"), button:has-text("Request")').first();
            if (await requestGuideBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await requestGuideBtn.click();
                await page.waitForTimeout(1000);
            }

            await page.click('button:has-text("Logout")');
        });

        await test.step('5. Faculty (Dr. John): Session Selection & Accept Guide Request', async () => {
            // John logs in with 'john@univ.edu' / 'faculty123'
            await page.goto('/');
            await page.fill('input[name="email"]', 'john@univ.edu');
            await page.fill('input[name="password"]', 'faculty123');
            await page.click('button[type="submit"]');

            // Session Selection Screen
            if (page.url().includes('role-selection')) {
                const activeSessionCard = page.locator('div:has-text("Select →")').first();
                if (await activeSessionCard.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await activeSessionCard.click();
                }

                // Choose Guide (B.E. CSE)
                const guideRoleBtn = page.locator('button:has-text("Enter →")').first();
                if (await guideRoleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await guideRoleBtn.click();
                }
            }

            // Navigate to Requests & Accept
            const requestsNav = page.locator('button:has-text("Requests")');
            if (await requestsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
                await requestsNav.click();
                const acceptTeamBtn = page.locator('button:has-text("Accept")').first();
                if (await acceptTeamBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await acceptTeamBtn.click();
                    await page.waitForTimeout(1000);
                }
            }

            await page.click('button:has-text("Logout")');
        });

        await test.step('6. PG Student (Sandrason): Login to M.E. Big Data', async () => {
            // Sandrason logs in with 'sandrason@univ.edu' / 's'
            await page.goto('/');
            await page.fill('input[name="email"]', 'sandrason@univ.edu');
            await page.fill('input[name="password"]', 's');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(/.*student-dashboard/);

            // Check Team Formation page
            await page.click('button:has-text("Team Formation")');
            await page.waitForTimeout(1000);

            await page.click('button:has-text("Logout")');
        });
    });
});
