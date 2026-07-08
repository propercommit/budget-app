import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
    title: "Terms and Conditions — PlanBudget",
    description:
        "The terms and conditions governing your access to and use of PlanBudget.",
}

/**
 * Public terms and conditions page. Content mirrors the legal source document
 * verbatim — edit wording only in coordination with the operator.
 */
export default function TermsAndConditionsPage() {
    return (
        <>
            <h1>PlanBudget — Terms and Conditions</h1>

            <p>
                <strong>Effective date:</strong> 7 July 2026
            </p>

            <h2>1. Who we are and what these Terms cover</h2>

            <p>
                PlanBudget (the &quot;Service&quot;) is a personal budgeting web application
                available at planbudget.ch, operated by:
            </p>

            <blockquote>
                N. Barbey
                <br />
                1110 Morges
                <br />
                Switzerland
                <br />
                <a href="mailto:nathanael@barbey.dev">nathanael@barbey.dev</a>
            </blockquote>

            <p>(referred to as &quot;we&quot;, &quot;us&quot; or the &quot;Operator&quot;).</p>

            <p>
                These Terms and Conditions (the &quot;Terms&quot;) govern your access to and
                use of the Service. By creating an account or using the Service, you
                enter into a binding agreement with the Operator on the basis of these
                Terms. If you do not agree with them, you must not use the Service.
            </p>

            <p>
                Information on how we process personal data is set out in our{" "}
                <Link href="/privacy">Privacy Policy</Link>.
            </p>

            <h2>2. What the Service is — and what it is not</h2>

            <p>
                The Service lets you organize your personal finances: record income
                sources and spending, create budget categories, track budgeted versus
                actual amounts, attach receipts and notes, import bank statement files
                (MT940 format) that you upload yourself, and view summaries, charts and
                trends based on your data.
            </p>

            <p>For clarity, the Service:</p>

            <ul>
                <li>
                    does <strong>not</strong> connect to your bank account and cannot
                    retrieve data from your bank — bank data enters the Service only
                    through files you deliberately upload;
                </li>
                <li>
                    does <strong>not</strong> execute payments, transfer funds or hold
                    money on your behalf;
                </li>
                <li>
                    is <strong>not</strong> a bank, financial intermediary or financial
                    institution and is not subject to supervision by the Swiss Financial
                    Market Supervisory Authority (FINMA);
                </li>
                <li>processes and displays only the data you provide or import.</li>
            </ul>

            <h2>3. No financial, tax or legal advice</h2>

            <p>
                The Service is an organizational tool. All figures, charts,
                categorizations and trends shown are computations based solely on the
                data you enter or import. Nothing in the Service constitutes financial,
                investment, tax, accounting or legal advice, and no output is a
                recommendation to take or refrain from taking any financial decision.
                You remain solely responsible for your financial decisions and for
                verifying displayed figures against your original bank documents.
            </p>

            <h2>4. Eligibility and your account</h2>

            <p>
                You must be at least 18 years old and have full legal capacity to use
                the Service.
            </p>

            <p>
                You agree to provide accurate registration information, to keep your
                login credentials confidential and not to share your account with
                others. You are responsible for all activity that occurs under your
                account. If you suspect unauthorized use, change your password
                immediately and notify us.
            </p>

            <p>
                If you sign in via a third-party identity provider (currently Google),
                your use of that sign-in method is additionally governed by that
                provider&apos;s own terms and privacy policy. We are not responsible for
                the availability or conduct of third-party identity providers.
            </p>

            <h2>5. Price</h2>

            <p>
                The Service is currently provided free of charge. You have no claim to
                the Service remaining free of charge, to the availability of any
                particular feature, or to the continued provision of the Service as
                such.
            </p>

            <p>
                We may introduce paid plans in the future and may make existing
                features, in whole or in part, subject to a paid plan. We will announce
                such changes at least 30 days in advance. A payment obligation arises
                only if you expressly subscribe to a paid plan; we will never charge
                you retroactively or without your active subscription. If you do not
                subscribe, we may restrict or discontinue the affected features for
                you, or terminate the agreement in accordance with Section 12.
            </p>

            <h2>6. Your data and uploaded content</h2>

            <p>
                As between you and us, all data you enter into or import to the Service
                — spending entries, income records, notes, receipts, bank statement
                files and similar content (&quot;Your Content&quot;) — remains yours.
            </p>

            <p>
                You grant us a non-exclusive, worldwide, royalty-free right to host,
                store, process, reproduce and display Your Content solely to the extent
                necessary to operate, secure, maintain and improve the Service for you.
                We do not sell Your Content and we do not use it for advertising.
                Details are set out in the <Link href="/privacy">Privacy Policy</Link>.
            </p>

            <p>
                You warrant that you are entitled to upload Your Content. Please note
                that bank statements typically contain personal data of third parties
                (for example, the names of payees or payers). You confirm that you use
                such data solely for your own personal budgeting and in compliance with
                applicable law. You must not upload content that is unlawful, infringes
                third-party rights or contains malicious code.
            </p>

            <p>
                The Service is not an archiving or bookkeeping system. Keep your
                original bank documents and receipts and do not rely on the Service as
                your only copy.
            </p>

            <h2>7. Acceptable use</h2>

            <p>When using the Service, you must not:</p>

            <ul>
                <li>use it for any unlawful purpose or in violation of these Terms;</li>
                <li>
                    interfere with or disrupt its operation, servers or networks, or
                    attempt to circumvent authentication or security measures;
                </li>
                <li>
                    access it by automated means (bots, scrapers) or systematically
                    extract data, except through functions we provide;
                </li>
                <li>
                    probe, scan or test the vulnerability of the Service without our
                    prior written consent;
                </li>
                <li>
                    reverse engineer, decompile or disassemble the software, except to
                    the extent such a restriction is prohibited by mandatory law;
                </li>
                <li>
                    resell, sublicense or otherwise make the Service available to third
                    parties as a service of your own.
                </li>
            </ul>

            <p>
                Violations of this section may lead to suspension or termination of
                your account (Section 12).
            </p>

            <h2>8. Intellectual property</h2>

            <p>
                The Service — including its software, design, graphics, logos and name
                — is protected by law and remains the property of the Operator or its
                licensors. For the duration of the agreement, you receive a limited,
                non-exclusive, non-transferable and revocable right to use the Service
                for your personal, non-commercial purposes. No further rights are
                granted.
            </p>

            <h2>9. Availability and changes to the Service</h2>

            <p>
                We provide the Service &quot;as available&quot;. We do not guarantee
                uninterrupted or error-free operation; access may be temporarily
                limited by maintenance, updates, capacity limits or disruptions at
                third-party infrastructure providers. There is no entitlement to
                support or to specific response times.
            </p>

            <p>
                We continuously develop the Service and may modify, add or remove
                features at any time. Features marked as beta or experimental may be
                changed or withdrawn without notice. If we discontinue the Service as a
                whole, we will give you reasonable advance notice so that you can save
                your data.
            </p>

            <h2>10. Warranty</h2>

            <p>
                To the extent permitted by law, and in view of the fact that the
                Service is provided free of charge, we disclaim all warranties,
                including warranties of accuracy, completeness, fitness for a
                particular purpose and availability. In particular, displayed figures
                depend entirely on the completeness and accuracy of the data you enter
                or import.
            </p>

            <h2>11. Liability</h2>

            <p>
                To the maximum extent permitted by law, we exclude all liability for
                damage arising out of or in connection with the use of, or inability to
                use, the Service, including loss of data and loss of profit.
            </p>

            <p>
                This exclusion does not apply to damage caused by our unlawful intent
                or gross negligence, nor to any other liability that cannot be excluded
                under mandatory Swiss law (in particular Art. 100 para. 1 of the Swiss
                Code of Obligations). Liability for auxiliary persons and third-party
                service providers is excluded to the extent permitted by Art. 101 para.
                2 of the Swiss Code of Obligations.
            </p>

            <h2>12. Term, termination and account deletion</h2>

            <p>The agreement runs for an indefinite period.</p>

            <p>
                You may end it at any time by deleting your account in the account
                settings of the Service. Deleting your account permanently removes your
                account and Your Content, as described in the{" "}
                <Link href="/privacy">Privacy Policy</Link>.
            </p>

            <p>
                We may terminate the agreement at any time subject to 30 days&apos;
                notice, communicated by email. We may suspend or terminate your account
                with immediate effect if you materially breach these Terms, if we are
                required to do so by law, or if this is necessary to protect the
                Service or its users; where reasonable, we will warn you first.
            </p>

            <h2>13. Indemnification</h2>

            <p>
                If third parties raise claims against us based on your unlawful use of
                the Service or your breach of these Terms — in particular in connection
                with content you uploaded — you will indemnify us against such claims,
                including the reasonable costs of legal defense, to the extent you are
                responsible for the breach.
            </p>

            <h2>14. Changes to these Terms</h2>

            <p>
                We may amend these Terms. We will announce material changes at least 30
                days before they take effect, by email or within the Service. If you do
                not agree with the changes, you may terminate the agreement free of
                charge before they take effect; your continued use of the Service after
                that date constitutes acceptance. Changes that are purely to your
                benefit, of an editorial nature, or required by law may take effect
                immediately.
            </p>

            <h2>15. Final provisions</h2>

            <p>
                Should individual provisions of these Terms be or become invalid, the
                validity of the remaining provisions shall remain unaffected. The
                invalid provision shall be replaced by a valid provision that comes
                closest to its economic purpose.
            </p>

            <p>
                We may transfer this agreement, together with your account data, to a
                legal successor of the Service (for example, in the course of
                incorporating a company or renaming the Service); we will inform you of
                any such transfer. You may not assign your rights under this agreement
                without our consent.
            </p>

            <p>
                These Terms are drafted in English. If translations are provided for
                convenience, the English version prevails.
            </p>

            <h2>16. Governing law and place of jurisdiction</h2>

            <p>
                This agreement is governed by substantive Swiss law, to the exclusion
                of its conflict-of-law rules and of the UN Convention on Contracts for
                the International Sale of Goods (CISG).
            </p>

            <p>
                The exclusive place of jurisdiction is{" "}
                <strong>Lausanne, Switzerland</strong>. Mandatory statutory places of
                jurisdiction — in particular the consumer forum under the Swiss Civil
                Procedure Code — remain reserved.
            </p>

            <hr />

            <p>
                <strong>Contact</strong>
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
