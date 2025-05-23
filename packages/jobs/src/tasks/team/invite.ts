import { resend } from "@/utils/resend";
import { InviteEmail } from "@pkg/email/emails/invite";
import { getI18n } from "@pkg/email/locales";
import { render } from "@react-email/render";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { nanoid } from "nanoid";
import { z } from "zod";

export const inviteTeamMembers = schemaTask({
  id: "invite-team-members",
  schema: z.object({
    teamId: z.string().uuid(),
    location: z.string(),
    ip: z.string(),
    locale: z.string(),
    invites: z.array(
      z.object({
        email: z.string().email(),
        invitedByName: z.string().uuid(),
        invitedByEmail: z.string().email(),
        teamName: z.string(),
        inviteCode: z.string(),
      }),
    ),
  }),
  maxDuration: 300,
  queue: {
    concurrencyLimit: 10,
  },
  run: async ({ location, ip, invites, locale }) => {
    const { t } = getI18n({ locale });

    const emails = invites?.map(async (invite) => ({
      from: "ZUUPEE <zuupeebot@zuupee.com>",
      to: [invite.email],
      subject: t("invite.subject", {
        invitedByName: invite.invitedByName,
        teamName: invite.teamName,
      }),
      headers: {
        "X-Entity-Ref-ID": nanoid(),
      },
      html: await render(
        InviteEmail({
          invitedByEmail: invite.invitedByEmail,
          invitedByName: invite.invitedByName,
          email: invite.email,
          teamName: invite.teamName,
          inviteCode: invite.inviteCode,
          ip,
          location,
          locale,
        }),
      ),
    }));

    const htmlEmails = await Promise.all(emails);

    await resend.batch.send(htmlEmails);
  },
});
