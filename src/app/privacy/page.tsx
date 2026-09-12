"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { APP_NAME } from "@/constants/app";

const LAST_UPDATED = "12 September 2026";
const CONTACT_EMAIL = "jaideep.saindane@gmail.com";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <Screen>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "1px solid var(--color-line)",
            background: "var(--color-surface)",
            color: "var(--color-ink)",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: "var(--font-title-size)" }}>Privacy Policy</h1>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Banner severity="watch">
          This is a real, honest description of how {APP_NAME} actually handles data today, written and kept up to date
          by the person who built it — but it has not been reviewed by a lawyer. Treat it as accurate, not as formal legal
          advice. It will be reviewed by a lawyer before any public marketing push or paid listing.
        </Banner>
      </div>

      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 16 }}>
        Last updated: {LAST_UPDATED}
      </p>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Who this policy is about</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {APP_NAME} is built and operated by Jaideep Saindane, an individual developer — not a registered company. For
          any privacy question, data request, or concern, contact <strong>{CONTACT_EMAIL}</strong>.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>What we collect, and why</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 8 }}>
          Using {APP_NAME} requires an account — either Google sign-in, or a phone number plus a 4-digit PIN you choose
          yourself. We collect and store, tied to that account:
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.8, marginBottom: 8 }}>
          <li><strong>Account info</strong> — your email (Google sign-in) or phone number and a securely hashed PIN (never the PIN itself), and your name/city if you add them.</li>
          <li><strong>Everything you enter about your tanks</strong> — tank details, fish/plant/equipment records, water-parameter logs, journal entries, and photos you upload — so it follows you across devices, which is the whole point of having an account.</li>
          <li><strong>Your questions and photos to Tank Scan, Ask {APP_NAME}, Emergency Triage, and photo species-ID</strong> — stored as your interaction history so you can look back at past answers.</li>
          <li><strong>Basic usage signals for us to run the app</strong> — sign-in method, and, in aggregate only (never tied to your individual content), counts like total accounts, tanks created, and AI calls made, so the person running this app can tell if it's working. We do not track you across other websites or apps, and there are no third-party analytics or advertising trackers in {APP_NAME}.</li>
        </ul>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          We only ask for what a feature genuinely needs. There is no advertising in {APP_NAME} and we do not sell your
          data to anyone, for any reason.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Signing up with a phone number — a real limitation</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          Phone + PIN sign-in does not verify that the number is actually yours — there is no SMS code sent. Your 4-digit
          PIN is the only thing protecting that account (locked after 5 wrong attempts in 15 minutes), and there is
          currently no self-serve way to recover a forgotten PIN — contact {CONTACT_EMAIL} if that happens. Choose a PIN
          that isn&apos;t easily guessed, and prefer Google sign-in if you can.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Where your data actually lives</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.8 }}>
          <li><strong>Your tanks, fish, logs, journal, chat history, and account details</strong> are stored in a Postgres database hosted by Neon, scoped to your account.</li>
          <li><strong>Photos you upload</strong> are stored on Vercel Blob storage. These files sit at an unguessable, randomly generated URL rather than behind a login check — in practice this means a photo can only be found by someone who already has its exact link, but it is not access-controlled the way your other data is. Don&apos;t upload a photo containing something you wouldn&apos;t want seen by someone who somehow obtained that link.</li>
          <li><strong>The app itself and its serverless functions</strong> run on Vercel.</li>
          <li><strong>The 1,484-entry species reference catalog</strong> (care info for fish/plants/shrimp/snails) is shared, identical for every user, and stored locally in your browser — it is not personal data.</li>
        </ul>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>What gets sent to AI providers</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.8, marginBottom: 8 }}>
          <li>Tank Scan, Ask {APP_NAME}, Emergency Triage, fish compatibility checks, and photo species-ID send the specific photo, question, or tank details you submit for that feature to an AI provider (Google Gemini, or Anthropic Claude for some features) so it can generate a response. Only what that feature needs is sent — never your whole account or database.</li>
          <li>These providers process that content to generate the response and do not use it to build a public product profile of you that we know of, but their own privacy terms — not this policy — govern exactly how they retain or use it. We don&apos;t control that; we chose providers with reasonable data-handling terms, but can&apos;t make guarantees on their behalf.</li>
        </ul>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          <strong>Medication and treatment answers can come from the AI&apos;s general knowledge, not just our own reviewed content, and are marked with a clear "not yet vet-reviewed" warning when that&apos;s the case</strong> — always confirm with a vet before treating a sick fish. This is a deliberate product tradeoff, explained in full in the app itself.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Your data is yours</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          You can export everything — full JSON, CSV spreadsheets, and your photos — at any time from Settings, at no
          cost, on the free tier, forever. This is a real commitment this app makes, not a Pro-only perk.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Deleting your data</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          Settings has a real, self-serve <strong>"Delete my account"</strong> button. It permanently deletes every tank,
          fish, log entry, photo, and AI-chat interaction tied to your account from our servers, right away — this
          cannot be undone, so export a copy first if you want to keep one. If you'd rather have us do it for you, or run
          into any trouble with it, email {CONTACT_EMAIL}.
        </p>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginTop: 8 }}>
          A photo you delete from your account is also deleted from Blob storage on a best-effort basis; in rare cases
          (a network error at the exact moment of deletion) an orphaned file with no remaining link to your account may
          briefly persist before routine cleanup removes it.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>How long we keep data</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          We keep your account data for as long as your account exists, so it&apos;s there whenever you come back. Deleting
          your account (above) removes it immediately rather than after some retention window. We don&apos;t currently
          auto-delete inactive accounts, but may add a "your account has been inactive for years, would you like to keep
          it" notice in the future rather than deleting silently.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Who can see your data</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          Your tanks, fish, logs, journal, and chat history are private to your account — no other user can see them.
          If you post in the Community section, that post (and any photos attached to it) is public to other {APP_NAME}
          users by design, the same way any public forum post is; your tank/fish data itself is never shown alongside it
          unless you choose to write it into the post yourself. Jaideep, as the person operating {APP_NAME}, can access
          the underlying database directly (a real-world consequence of being a single-developer project without a
          formal support team) but does not browse individual users&apos; tank data as a matter of course — the private
          usage dashboard he uses to run the app shows only aggregate counts, not anyone&apos;s actual tank/journal/chat
          content.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Age</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {APP_NAME} does not currently restrict sign-up by age. If you believe a child has created an account and you'd
          like it removed, email {CONTACT_EMAIL} and we'll delete it.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Security</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          We use standard measures — hashed PINs, session tokens, and access checks on every server request — to protect
          your account. No online service can guarantee perfect security, and this app has not yet had an independent
          third-party security audit. If you discover a security issue, please email {CONTACT_EMAIL} directly rather than
          posting it publicly, so it can be fixed before it&apos;s more widely known.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Changes to this policy</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          If how {APP_NAME} handles data changes in a way that matters, this page will be updated and the date at the top
          will change. We won&apos;t quietly narrow any of the commitments above without saying so here first.
        </p>
      </Card>

      <Card>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Questions</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          Email <strong>{CONTACT_EMAIL}</strong> with anything — a data request, a correction to this page, or just a
          question about how something works.
        </p>
      </Card>
    </Screen>
  );
}
