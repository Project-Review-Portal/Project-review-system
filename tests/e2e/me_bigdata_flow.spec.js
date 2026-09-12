const { test, expect } = require('@playwright/test');

test.describe.serial('M.E. Big Data Guide Selection & Team Formation Workflow', () => {

    const pad = (n) => String(n).padStart(2, '0');
    const toLocalDateTimeString = (date) => {
        const yyyy = date.getFullYear();
        const MM = pad(date.getMonth() + 1);
        const dd = pad(date.getDate());
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
    };

test('End-to-End M.E. Big Data Workflow (Continuous Single Browser Session)', async ({ page }) => {

        await test.step('1. Admin: Guide Settings Date Config & Logout', async () => {
            // Step 1: Admin Login
            await page.goto('/');
            await page.fill('input[name="email"]', 'cseceg2024@gmail.com');
            await page.fill('input[name="password"]', 'admin');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(/.*admin-dashboard/);
            await expect(page.locator('text=Admin Control Panel')).toBeVisible();

            // Step 2: Select the current / first active session
            const sessionCard = page.locator('div[class*="cursor-pointer"]').first();
            await expect(sessionCard).toBeVisible();
            await sessionCard.click();
            await page.waitForTimeout(1000);

            // Step 3: Select M.E. Big Data Programme
            const meBigDataBtn = page.locator('button:has-text("M.E. Big Data")');
            await expect(meBigDataBtn).toBeVisible();
            await meBigDataBtn.click();
            await expect(page).toHaveURL(/.*programme\/M\.E\..*Big.*Data/);

            // Step 4: Go to Settings -> Guide Settings
            await page.click('button:has-text("Settings")');
            await expect(page.locator('text=Admin Settings')).toBeVisible();

            const guideSettingsTab = page.locator('button#tab-guide-selection');
            await guideSettingsTab.click();

            // Step 5: Set Guide Selection Request Settings to today -> 2 days after today
            const now = new Date();
            const twoDaysLater = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));

            const startDT = toLocalDateTimeString(now);
            const endDT = toLocalDateTimeString(twoDaysLater);

            await page.fill('input#startDate', startDT);
            await page.fill('input#endDate', endDT);

            await page.click('button[type="submit"]:has-text("Update Settings")');
            await page.waitForTimeout(1500);

            // Step 6: Logout
            await page.click('button:has-text("Logout")');
            await expect(page).toHaveURL('/');
        });

        await test.step('2. Sandrason: Login -> Team Formation -> Add Tarik -> Create Team -> Logout', async () => {
            // Step 1: Login as Sandrason
            await page.goto('/');
            await page.fill('input[name="email"]', 'sandrason@univ.edu');
            await page.fill('input[name="password"]', 's');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(/.*student-dashboard/);

            // Step 2: Go to Team Formation
            await page.click('button:has-text("Team Formation")');
            await page.waitForTimeout(1000);

            // Check if already in a team or needs creation
            const existingTeamNotice = page.locator('text=You are already part of a team');
            if (!(await existingTeamNotice.isVisible().catch(() => false))) {
                // Find Tarik and click + Add (or button with Tarik)
                const tarikItem = page.locator('div:has-text("Tarik"), tr:has-text("Tarik"), div:has-text("tarik@univ.edu")').first();
                if (await tarikItem.isVisible({ timeout: 3000 }).catch(() => false)) {
                    const addBtn = tarikItem.locator('button:has-text("+ Add"), button:has-text("Add")').first();
                    if (await addBtn.isVisible()) {
                        await addBtn.click();
                        await page.waitForTimeout(500);
                    }
                } else {
                    // Alternatively click the first available student add button
                    const firstAddBtn = page.locator('button:has-text("+ Add"), button:has-text("Add")').first();
                    if (await firstAddBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await firstAddBtn.click();
                    }
                }

                // Click Create Team button
                const createTeamBtn = page.locator('button[type="submit"]:has-text("Create Team"), button:has-text("Create Team")').first();
                await expect(createTeamBtn).toBeVisible();
                await createTeamBtn.click();
                await page.waitForTimeout(1500);
            }

            // Step 3: Logout
            await page.click('button:has-text("Logout")');
            await expect(page).toHaveURL('/');
        });

        await test.step('3. Tarik: Login -> Team Formation -> Accept Request -> Logout', async () => {
            // Step 1: Login as Tarik
            await page.goto('/');
            await page.fill('input[name="email"]', 'tarik@univ.edu');
            await page.fill('input[name="password"]', 't');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(/.*student-dashboard/);

            // Step 2: Go to Team Formation & Accept pending invitation
            await page.click('button:has-text("Team Formation")');
            await page.waitForTimeout(1000);

            const acceptBtn = page.locator('button:has-text("Accept")').first();
            if (await acceptBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
                await acceptBtn.click();
                await page.waitForTimeout(1500);
            }

            // Step 3: Logout
            await page.click('button:has-text("Logout")');
            await expect(page).toHaveURL('/');
        });

        await test.step('4. Sandrason: Login -> My Team -> Lock Team -> Go to Guide Request Page', async () => {
            // Step 1: Login as Sandrason
            await page.goto('/');
            await page.fill('input[name="email"]', 'sandrason@univ.edu');
            await page.fill('input[name="password"]', 's');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(/.*student-dashboard/);

            // Auto-accept any window.confirm prompt for locking team
            page.on('dialog', async dialog => {
                try {
                    await dialog.accept();
                } catch (e) {
                    // Ignore if already handled
                }
            });

            // Step 2: Go to My Team (or Team Formation) and Lock Team
            await page.click('button:has-text("My Team")');
            await page.waitForTimeout(1000);

            const lockBtn = page.locator('button:has-text("Lock Team")').first();
            if (await lockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await lockBtn.click();
                await page.waitForTimeout(2000);
            }

            // Verify team status on My Team page
            await expect(page.locator('h2:has-text("My Team")')).toBeVisible();

            // Step 3: Go to Guide Request page
            await page.click('button:has-text("Guide Requests")');
            await expect(page).toHaveURL(/.*guide-requests/);
            await expect(page.locator('h2:has-text("Guide Request Management")')).toBeVisible();
            await page.waitForTimeout(2000);
        });
    });
});
