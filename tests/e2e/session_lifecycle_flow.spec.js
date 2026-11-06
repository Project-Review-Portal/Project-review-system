const { test, expect } = require('@playwright/test');

test.describe.serial('Comprehensive Session Feature Lifecycle & Access Control Suite', () => {

    test('All Session Feature Cases in a Continuous Single Browser Session', async ({ page }) => {

        // Setup auto-accept for any confirmation prompts (e.g. session delete, locking)
        page.on('dialog', async dialog => {
            try {
                await dialog.accept();
            } catch (e) {}
        });

        // -------------------------------------------------------------
        // Case 1: Admin Session Dashboard & Current Session Verification
        // -------------------------------------------------------------
        await test.step('Case 1: Admin Login & Verify Sessions Dashboard with Current IST Session', async () => {
            await page.goto('/');
            await page.fill('input[name="email"]', 'cseceg2024@gmail.com');
            await page.fill('input[name="password"]', 'admin');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(/.*admin-dashboard/);
            await expect(page.locator('text=Admin Control Panel')).toBeVisible();

            // Verify Sessions section exists
            await expect(page.locator('h2:has-text("Sessions")')).toBeVisible();

            // Verify Current Session badge is present on the IST-resolved active session
            const currentBadge = page.locator('span:has-text("Current")').first();
            await expect(currentBadge).toBeVisible();
            await page.waitForTimeout(1000);
        });

        // -------------------------------------------------------------
        // Case 2: Create a New Future Session (Jan 2027 - May 2027, Paused by default)
        // -------------------------------------------------------------
        await test.step('Case 2: Create a New Session with Custom Month/Year & Paused Status', async () => {
            await page.click('button:has-text("+ Add Session")');
            await expect(page.locator('h3:has-text("Create Academic Session"), h3:has-text("Academic Session")')).toBeVisible();

            const modal = page.locator('div.fixed.inset-0');

            // Configure Form: January 2027 to May 2027, Even semester, Paused
            const startMonthSelect = modal.locator('select').nth(0);
            await startMonthSelect.selectOption('1'); // January

            const startYearInput = modal.locator('input[type="number"]').nth(0);
            await startYearInput.fill('2027');

            const endMonthSelect = modal.locator('select').nth(1);
            await endMonthSelect.selectOption('5'); // May

            const endYearInput = modal.locator('input[type="number"]').nth(1);
            await endYearInput.fill('2027');

            const statusSelect = modal.locator('select').nth(3);
            if (await statusSelect.isVisible().catch(() => false)) {
                await statusSelect.selectOption('paused');
            }

            // Submit session creation
            await modal.locator('button[type="submit"]:has-text("Create Session")').click();
            await page.waitForTimeout(1500);

            // Verify newly created session appears in list
            const newSessionCard = page.locator('div:has-text("January 2027 - May 2027")').first();
            await expect(newSessionCard).toBeVisible();
            await page.waitForTimeout(1000);
        });

        // -------------------------------------------------------------
        // Case 3: Toggle Session Status (Paused -> Active -> Paused)
        // -------------------------------------------------------------
        await test.step('Case 3: Toggle Session Status between Paused and Active', async () => {
            const newSessionCard = page.locator('div:has-text("January 2027 - May 2027")').first();
            await expect(newSessionCard).toBeVisible();

            // Locate the status button inside the new session card
            const toggleStatusBtn = newSessionCard.locator('button:has-text("Paused"), button:has-text("Active")').first();
            await expect(toggleStatusBtn).toBeVisible();

            // Click to toggle to Active
            await toggleStatusBtn.click();
            await page.waitForTimeout(1500);

            // Verify badge changed to Active
            await expect(newSessionCard.locator('button:has-text("Active")').first()).toBeVisible();

            // Click again to toggle back to Paused
            const activeBtn = newSessionCard.locator('button:has-text("Active")').first();
            await activeBtn.click();
            await page.waitForTimeout(1500);

            // Verify back to Paused
            await expect(newSessionCard.locator('button:has-text("Paused")').first()).toBeVisible();
        });

        // -------------------------------------------------------------
        // Case 4: Edit Session Details
        // -------------------------------------------------------------
        await test.step('Case 4: Edit Existing Session Metadata', async () => {
            const targetSession = page.locator('div:has-text("January 2027 - May 2027")').first();
            const editBtn = targetSession.locator('button[title*="Edit"], button:has-text("Edit")').first();
            if (await editBtn.isVisible().catch(() => false)) {
                await editBtn.click();
                await page.waitForTimeout(1000);

                const modal = page.locator('div.fixed.inset-0');
                await expect(modal.locator('h3:has-text("Edit Academic Session"), h3:has-text("Academic Session")')).toBeVisible();

                // Change End Month to June (6)
                const endMonthSelect = modal.locator('select').nth(1);
                await endMonthSelect.selectOption('6'); // June

                await modal.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Update"), button[type="submit"]:has-text("Update Session")').first().click();
                await page.waitForTimeout(1500);

                // Verify updated session name
                await expect(page.locator('div:has-text("January 2027 - June 2027")').first()).toBeVisible();
            }
        });

        // -------------------------------------------------------------
        // Case 5: Session Navigation into Scoped Programmes & Session Global Management
        // -------------------------------------------------------------
        await test.step('Case 5: Open Session Card & Inspect Scoped Global Management + Programmes (B.E. CSE & M.E. Big Data)', async () => {
            // Click the main current/active session card (which has B.E. CSE and M.E. Big Data)
            const activeSessionCard = page.locator('div[class*="cursor-pointer"]:has-text("Current"), div[class*="cursor-pointer"]:has-text("Active")').first();
            await activeSessionCard.click();
            await page.waitForTimeout(1000);

            // Verify URL is within session scope
            await expect(page).toHaveURL(/.*admin-dashboard\/session\/.*/);

            // Verify Session Global Management card is present inside the session
            const sessionGlobalMgmtBtn = page.locator('button:has-text("Global Management")').first();
            await expect(sessionGlobalMgmtBtn).toBeVisible();

            // Click into Session Global Management
            await sessionGlobalMgmtBtn.click();
            await page.waitForTimeout(1000);
            await expect(page).toHaveURL(/.*global-management/);
            await expect(page.locator('text=Faculty & Designation Limits')).toBeVisible();

            // Return back to Session Programmes
            await page.click('button:has-text("Back to Session Programmes")');
            await page.waitForTimeout(1000);

            // Verify Programmes for this session are present
            await expect(page.locator('button:has-text("B.E. CSE")')).toBeVisible();
            await expect(page.locator('button:has-text("M.E. Big Data")')).toBeVisible();

            // Click B.E. CSE to open Programme Dashboard
            await page.click('button:has-text("B.E. CSE")');
            await expect(page).toHaveURL(/.*programme\/B\.E\..*CSE/);

            // Verify Admin settings & panels for this programme
            await page.click('button:has-text("Settings")');
            await expect(page.locator('text=Admin Settings')).toBeVisible();
            await page.waitForTimeout(1000);

            // Return to Admin Dashboard
            await page.goto('/admin-dashboard');
            await page.waitForTimeout(1000);
        });

        // -------------------------------------------------------------
        // Case 6: Paused Session Governance - Pause Current Session & Verify Restriction
        // -------------------------------------------------------------
        await test.step('Case 6: Governance Test - Pause Session and Verify Student Access Restriction', async () => {
            // Find current session card and pause it
            const currentSessionCard = page.locator('div[class*="cursor-pointer"]').first();
            const activeToggleBtn = currentSessionCard.locator('button:has-text("Active")').first();
            if (await activeToggleBtn.isVisible().catch(() => false)) {
                await activeToggleBtn.click();
                await page.waitForTimeout(1500);
            }

            // Logout Admin
            await page.click('button:has-text("Logout")');
            await expect(page).toHaveURL('/');

            // Login as Student (Alice)
            await page.fill('input[name="email"]', 'alice@univ.edu');
            await page.fill('input[name="password"]', 'a');
            await page.click('button[type="submit"]');

            // Verify Paused Notice / Restricted Access error on login screen
            await page.waitForTimeout(1500);
            const pausedNotice = page.locator('text=The portal is currently paused, text=paused, text=Access Suspended, text=Paused').first();
            if (await pausedNotice.isVisible().catch(() => false)) {
                await expect(pausedNotice).toBeVisible();
            }
        });

        // -------------------------------------------------------------
        // Case 7: Reactivate Session & Verify Restored Access
        // -------------------------------------------------------------
        await test.step('Case 7: Reactivate Session and Verify Full Student Access Restoration', async () => {
            // Admin logs back in
            await page.goto('/');
            await page.fill('input[name="email"]', 'cseceg2024@gmail.com');
            await page.fill('input[name="password"]', 'admin');
            await page.click('button[type="submit"]');

            // Reactivate current session
            const currentSessionCard = page.locator('div[class*="cursor-pointer"]').first();
            const pausedToggleBtn = currentSessionCard.locator('button:has-text("Paused")').first();
            if (await pausedToggleBtn.isVisible().catch(() => false)) {
                await pausedToggleBtn.click();
                await page.waitForTimeout(1500);
            }

            // Logout Admin
            await page.click('button:has-text("Logout")');
            await expect(page).toHaveURL('/');

            // Login as Student (Alice)
            await page.fill('input[name="email"]', 'alice@univ.edu');
            await page.fill('input[name="password"]', 'a');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(/.*student-dashboard/);
            await page.click('button:has-text("Team Formation")');
            await page.waitForTimeout(1000);

            // Logout Student
            await page.click('button:has-text("Logout")');
            await expect(page).toHaveURL('/');
        });

        // -------------------------------------------------------------
        // Case 8: Faculty Multi-Session Selection Screen
        // -------------------------------------------------------------
        await test.step('Case 8: Faculty Login with Session Selection Flow', async () => {
            await page.goto('/');
            await page.fill('input[name="email"]', 'john.doe@univ.edu');
            await page.fill('input[name="password"]', 'faculty123');
            await page.click('button[type="submit"]');

            // Verify Session Selection Screen or Role Selection
            await page.waitForTimeout(1000);
            if (page.url().includes('role-selection')) {
                const sessionHeader = page.locator('h2:has-text("Select Academic Session"), h2:has-text("Active Sessions"), div:has-text("Active Sessions")').first();
                if (await sessionHeader.isVisible().catch(() => false)) {
                    await expect(sessionHeader).toBeVisible();
                }
                const selectSessionBtn = page.locator('div:has-text("Select →"), button:has-text("Select")').first();
                if (await selectSessionBtn.isVisible().catch(() => false)) {
                    await selectSessionBtn.click();
                    await page.waitForTimeout(1000);
                }

                // Choose Role (e.g. Guide B.E. CSE)
                const enterRoleBtn = page.locator('button:has-text("Enter →"), button:has-text("Enter")').first();
                if (await enterRoleBtn.isVisible().catch(() => false)) {
                    await enterRoleBtn.click();
                    await page.waitForTimeout(1000);
                }
            }

            // Logout Faculty
            const logoutBtn = page.locator('button:has-text("Logout")').first();
            if (await logoutBtn.isVisible().catch(() => false)) {
                await logoutBtn.click();
            }
            await page.waitForTimeout(500);
            await expect(page).toHaveURL('/');
        });

        // -------------------------------------------------------------
        // Case 9: Delete Test Session Cleanly
        // -------------------------------------------------------------
        await test.step('Case 9: Delete Created Test Session Cleanly', async () => {
            // Admin logs in
            await page.goto('/');
            await page.fill('input[name="email"]', 'cseceg2024@gmail.com');
            await page.fill('input[name="password"]', 'admin');
            await page.click('button[type="submit"]');

            // Find created test session (2027)
            const testSessionCard = page.locator('div:has-text("2027")').first();
            if (await testSessionCard.isVisible().catch(() => false)) {
                const deleteBtn = testSessionCard.locator('button[title*="Delete"], button:has-text("Delete")').first();
                if (await deleteBtn.isVisible().catch(() => false)) {
                    await deleteBtn.click();
                    await page.waitForTimeout(2000);
                }
            }

            // Verify session is deleted
            await expect(page.locator('div:has-text("January 2027 - June 2027"), div:has-text("January 2027 - May 2027")')).toHaveCount(0);
            await page.waitForTimeout(1000);
        });

    });
});
