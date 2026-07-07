import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Privacy Policy — PlanBudget",
    description:
        "How PlanBudget processes personal data under the Swiss Federal Act on Data Protection (FADP).",
}

/**
 * Public privacy policy page. Content mirrors the legal source document
 * verbatim — edit wording only in coordination with the operator.
 */
export default function PrivacyPolicyPage() {
    return (
        <>
            <h1>PlanBudget — Privacy Policy</h1>

            <p>
                <strong>Effective date:</strong> 7 July 2026
            </p>

            <p>
                This Privacy Policy explains how we process personal data when you use
                PlanBudget, the personal budgeting web application available at
                planbudget.ch (the &quot;Service&quot;). The Service is directed at users in
                Switzerland. If you use it from another country, your personal data is
                likewise processed in accordance with this Policy and Swiss data
                protection law. This Policy is issued under the Swiss Federal Act on
                Data Protection (FADP).
            </p>

            <h2>1. Controller</h2>

            <p>The controller responsible for the processing of your personal data is:</p>

            <blockquote>
                Nathanael Barbey
                <br />
                1110 Morges
                <br />
                Switzerland
                <br />
                Email: <a href="mailto:nathanael@barbey.dev">nathanael@barbey.dev</a>
            </blockquote>

            <h2>2. What data we process</h2>

            <p>
                <strong>Account data.</strong> Your email address, an optional display
                name, and your password. Passwords are managed by our authentication
                provider (Supabase) in hashed form only — we never see or store your
                password in plain text. If you choose &quot;Sign in with Google&quot;, Google
                transmits to us your email address and basic profile information (such
                as your name).
            </p>

            <p>
                <strong>Budget and financial data you enter.</strong> Categories,
                spending items and spending entries (names, amounts, direction, dates,
                notes, links), income sources (name, amount, active/passive type,
                period, notes) and monthly budgets. This data is the core of the
                Service. It can reveal detailed information about your financial
                situation, and we treat it with corresponding care (see Section 9).
            </p>

            <p>
                <strong>Receipts.</strong> Images you attach to spending entries.
                Images are compressed in your browser before upload and stored in our
                database.
            </p>

            <p>
                <strong>Imported bank statement data.</strong> If you use the bank
                statement import (MT940 files you upload yourself), we process the
                transaction data contained in the file — dates, amounts, currency,
                booking texts and counterparty references — in order to create spending
                entries for you. We do not retain the raw statement file after
                processing. Bank statements typically contain personal data of third
                parties, such as the names of payees or payers. We process such data
                exclusively on your instruction and solely for your personal budgeting.
            </p>

            <p>
                <strong>Settings.</strong> Your currency, date format and display
                preferences (such as dark mode).
            </p>

            <p>
                <strong>Technical data.</strong> Server logs generated when you access
                the Service (IP address, timestamps, browser and device information,
                requested pages); session and security data (authentication cookies and
                token identifiers we keep in a blocklist to invalidate sessions); and
                aggregated, cookie-less usage and performance statistics (see Section
                7).
            </p>

            <h2>3. Purposes of processing</h2>

            <p>We process your data to:</p>

            <ul>
                <li>provide and operate the Service (performance of our agreement with you);</li>
                <li>authenticate you and keep the Service secure, including preventing abuse and invalidating sessions;</li>
                <li>send you transactional messages (such as sign-up confirmation and password reset emails);</li>
                <li>understand and improve the Service on the basis of aggregated statistics;</li>
                <li>comply with legal obligations and establish, exercise or defend legal claims.</li>
            </ul>

            <h2>4. What we never do</h2>

            <ul>
                <li>
                    We never ask for your e-banking credentials and have no connection to
                    your bank — bank data enters the Service only through files you
                    deliberately upload.
                </li>
                <li>
                    We do not sell your data, do not use it for advertising, and do not
                    share it with advertising networks.
                </li>
                <li>
                    We do not use your financial data for any purpose other than
                    providing the Service to you.
                </li>
            </ul>

            <h2>5. Service providers</h2>

            <p>
                We use the following providers, which process personal data on our
                behalf under data-processing agreements and may not use it for their
                own purposes:
            </p>

            <div className="overflow-x-auto">
                <table>
                    <thead>
                        <tr>
                            <th>Provider</th>
                            <th>Purpose</th>
                            <th>Location of processing</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Supabase Inc. (USA)</td>
                            <td>Database hosting and authentication</td>
                            <td>Database region: Zurich, Switzerland (AWS eu-central-2)</td>
                        </tr>
                        <tr>
                            <td>Vercel Inc. (USA)</td>
                            <td>
                                Application hosting and delivery; cookie-less analytics and
                                performance monitoring
                            </td>
                            <td>
                                Global edge network; server functions in Frankfurt, Germany
                                (EEA)
                            </td>
                        </tr>
                        <tr>
                            <td>Upstash Inc. (USA)</td>
                            <td>Session security (token blocklist)</td>
                            <td>[REGION — see Upstash dashboard]</td>
                        </tr>
                        <tr>
                            <td>Resend (USA)</td>
                            <td>Delivery of transactional emails</td>
                            <td>USA</td>
                        </tr>
                        <tr>
                            <td>Google (Google Ireland Ltd. / Google LLC)</td>
                            <td>Optional &quot;Sign in with Google&quot;</td>
                            <td>EEA / USA</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p>
                If you use Google sign-in, Google also processes your data under its
                own privacy policy.
            </p>

            <h2>6. Where your data goes (disclosure abroad)</h2>

            <p>
                Your data is processed in Switzerland and abroad, in particular in the
                European Economic Area and the United States (see Section 5).
            </p>

            <p>
                Countries of the EEA are recognized by the Swiss Federal Council as
                providing an adequate level of data protection. For the United States,
                recipients certified under the Swiss–U.S. Data Privacy Framework are
                likewise recognized as adequate. Where a recipient is not covered by an
                adequacy decision, we rely on appropriate safeguards, in particular the
                standard contractual clauses recognized by the Federal Data Protection
                and Information Commissioner (FDPIC).
            </p>

            <h2>7. Cookies and analytics</h2>

            <p>
                The Service uses only cookies that are strictly necessary for its
                operation: authentication and session cookies set by our authentication
                provider (Supabase) to keep you signed in. We do not use advertising or
                cross-site tracking cookies. If you block essential cookies, you cannot
                stay signed in.
            </p>

            <p>
                For usage and performance measurement we use Vercel Analytics and
                Vercel Speed Insights. These operate without cookies and without
                persistent identifiers that follow you across websites; the resulting
                statistics are aggregated.
            </p>

            <h2>8. How long we keep your data</h2>

            <ul>
                <li>
                    <strong>Account and content data:</strong> until you delete your
                    account. You can delete your account at any time in the account
                    settings of the Service; this permanently removes your account and
                    all associated content — categories, spending items and entries,
                    receipts, income records and settings — from our live database.
                    Residual copies in encrypted backups are purged within 30 days.
                </li>
                <li>
                    <strong>Server and security logs:</strong> kept for short periods for
                    security and diagnostic purposes.
                </li>
                <li>
                    <strong>Longer retention</strong> applies only where required by law
                    or necessary to establish, exercise or defend legal claims.
                </li>
            </ul>

            <h2>9. Security</h2>

            <p>
                We protect your data through appropriate technical and organizational
                measures, including encryption in transit (TLS), encryption at rest by
                our hosting providers, hashed password storage, access controls and
                active session invalidation. No method of transmission or storage is
                completely secure; if you suspect a security issue with your account,
                contact us at{" "}
                <a href="mailto:nathanael@barbey.dev">nathanael@barbey.dev</a>.
            </p>

            <h2>10. Your rights</h2>

            <p>Under the FADP you have the right to:</p>

            <ul>
                <li>
                    request information about the personal data we process about you
                    (Art. 25 FADP);
                </li>
                <li>have inaccurate data corrected;</li>
                <li>request deletion of your data;</li>
                <li>
                    receive the data you have provided to us in a commonly used
                    electronic format, or have it transferred to another controller
                    (data portability, Art. 28 FADP);
                </li>
                <li>object to a given processing or request that it be restricted.</li>
            </ul>

            <p>
                You can exercise the most important rights yourself, directly in the
                Service: your data is visible and editable at any time, you can
                download all your budget data as a CSV file in the account settings,
                and you can delete individual records or your entire account there as
                well. For anything else — or if you prefer — contact us at{" "}
                <a href="mailto:nathanael@barbey.dev">nathanael@barbey.dev</a>. We may
                ask you to verify your identity and will respond within the statutory
                period, generally 30 days. You may also lodge a complaint with the
                Federal Data Protection and Information Commissioner (FDPIC), Bern.
            </p>

            <h2>11. No automated individual decision-making</h2>

            <p>
                We do not make automated decisions within the meaning of Art. 21 FADP
                that produce legal effects for you or significantly affect you. Charts,
                trends and budget computations are simply displays of your own data,
                generated at your instruction.
            </p>

            <h2>12. Minors</h2>

            <p>The Service is not directed at persons under 18 years of age.</p>

            <h2>13. Changes to this Policy</h2>

            <p>
                The current version of this Policy is published within the Service. We
                will announce material changes in the Service or by email.
            </p>

            <hr />

            <p>
                <strong>Contact for privacy matters</strong>
            </p>

            <p>
                Nathanael Barbey
                <br />
                1110 Morges, Switzerland
                <br />
                Email: <a href="mailto:nathanael@barbey.dev">nathanael@barbey.dev</a>
            </p>
        </>
    )
}
