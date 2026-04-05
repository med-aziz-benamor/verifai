import type { EmailMessageDetail } from "@/lib/verifai-api";

interface EmailBodyPreviewProps {
  email: EmailMessageDetail;
}

const HTML_LIKE_PATTERN = /<!doctype|<html[\s>]|<body[\s>]|<\/?[a-z][\s\S]*>/i;

const looksLikeHtml = (value: string | null | undefined) => Boolean(value && HTML_LIKE_PATTERN.test(value));

const normalizePlainText = (value: string) =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const buildEmailDocument = (email: EmailMessageDetail) => {
  const rawContent = email.body_html || email.body_text;
  if (!rawContent) {
    return null;
  }

  const hasDocumentShell = /<!doctype|<html[\s>]/i.test(rawContent);
  if (hasDocumentShell) {
    return rawContent;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
      }

      body {
        margin: 0;
        padding: 24px;
        background: #ffffff;
        color: #202124;
        font: 14px/1.6 Arial, Helvetica, sans-serif;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      table {
        max-width: 100%;
      }

      a {
        color: #1a73e8;
      }
    </style>
  </head>
  <body>
    ${rawContent}
  </body>
</html>`;
};

const EmailBodyPreview = ({ email }: EmailBodyPreviewProps) => {
  const preferredBody = email.body_html || email.body_text || email.snippet;
  const shouldRenderHtml = looksLikeHtml(email.body_html) || looksLikeHtml(email.body_text);
  const previewDocument = shouldRenderHtml ? buildEmailDocument(email) : null;
  const plainTextBody = normalizePlainText(preferredBody);

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">{email.subject}</h3>
          <div className="space-y-1 text-sm text-slate-600">
            <p className="break-all">
              <span className="font-semibold text-slate-900">From:</span> {email.from}
            </p>
            {email.to.length > 0 && (
              <p className="break-all">
                <span className="font-semibold text-slate-900">To:</span> {email.to.join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {previewDocument ? (
        <iframe
          title={`Email preview for ${email.subject}`}
          srcDoc={previewDocument}
          sandbox=""
          className="h-[560px] w-full bg-white"
        />
      ) : (
        <div className="px-6 py-5">
          <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-800">
              {plainTextBody || "This email does not include previewable content."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailBodyPreview;
