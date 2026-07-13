import { MessageDirection, TicketCategory, TicketStatus } from "@prisma/client";
import { prisma } from "../db/prisma";

type TicketScenario = {
  body: string;
  category: TicketCategory;
  requesterEmail: string;
  status: TicketStatus;
  subject: string;
};

const ticketScenarios: TicketScenario[] = [
  {
    body: "The dashboard accepts my password reset but redirects back to sign in.",
    category: TicketCategory.technical_question,
    requesterEmail: "maya.patel@northstarlearn.test",
    status: TicketStatus.open,
    subject: "Password reset loop on course dashboard"
  },
  {
    body: "I accidentally bought the annual plan twice and need one charge reversed.",
    category: TicketCategory.refund_request,
    requesterEmail: "aayushtripathi.enjay@gmail.com",
    status: TicketStatus.resolved,
    subject: "Duplicate annual subscription charge"
  },
  {
    body: "My certificate still shows my maiden name after I updated my profile.",
    category: TicketCategory.general_question,
    requesterEmail: "aayushtripathi1920.t@gmail.com",
    status: TicketStatus.open,
    subject: "Certificate needs updated legal name"
  },
  {
    body: "The video player freezes every time lesson 14 reaches the recap section.",
    category: TicketCategory.technical_question,
    requesterEmail: "nitesh.sharma@gmail.com",
    status: TicketStatus.open,
    subject: "Video freezes in lesson 14"
  },
  {
    body: "I selected the wrong course bundle and want to switch or refund it.",
    category: TicketCategory.refund_request,
    requesterEmail: "nscoder@gmail.com",
    status: TicketStatus.closed,
    subject: "Purchased the wrong course bundle"
  },
  {
    body: "Can you confirm whether the TypeScript course includes a completion quiz?",
    category: TicketCategory.general_question,
    requesterEmail: "aakankshas.enjay@gmail.com",
    status: TicketStatus.resolved,
    subject: "Question about TypeScript course quiz"
  },
  {
    body: "The mobile app downloaded lessons but says they are unavailable offline.",
    category: TicketCategory.technical_question,
    requesterEmail: "saurabh.singh@gmail.com",
    status: TicketStatus.open,
    subject: "Offline downloads unavailable in mobile app"
  },
  {
    body: "My employer reimbursed a different training option, so I need to cancel.",
    category: TicketCategory.refund_request,
    requesterEmail: "harshsingh.enjay@gmail.com",
    status: TicketStatus.open,
    subject: "Refund after employer selected another training"
  },
  {
    body: "I need an invoice with my company VAT number for last month's payment.",
    category: TicketCategory.general_question,
    requesterEmail: "amelia.ross@ledgerops.test",
    status: TicketStatus.resolved,
    subject: "Invoice with VAT number"
  },
  {
    body: "The quiz submit button stays disabled after all answers are selected.",
    category: TicketCategory.technical_question,
    requesterEmail: "lucas.kim@quizworks.test",
    status: TicketStatus.open,
    subject: "Quiz submit button remains disabled"
  },
  {
    body: "My bank shows a charge even though checkout displayed an error.",
    category: TicketCategory.refund_request,
    requesterEmail: "mia.thompson@checkoutlab.test",
    status: TicketStatus.open,
    subject: "Charged after failed checkout"
  },
  {
    body: "Please merge my old student account with my new work email account.",
    category: TicketCategory.general_question,
    requesterEmail: "benjamin.garcia@alumnihub.test",
    status: TicketStatus.open,
    subject: "Merge two learning accounts"
  },
  {
    body: "Captions are missing from the advanced React module on Safari.",
    category: TicketCategory.technical_question,
    requesterEmail: "charlotte.davis@safarilearn.test",
    status: TicketStatus.resolved,
    subject: "Missing captions on Safari"
  },
  {
    body: "I cancelled during the trial but my card was billed this morning.",
    category: TicketCategory.refund_request,
    requesterEmail: "henry.miller@trialdesk.test",
    status: TicketStatus.resolved,
    subject: "Trial cancellation still billed"
  },
  {
    body: "Does the subscription include access for my five-person engineering team?",
    category: TicketCategory.general_question,
    requesterEmail: "harper.anderson@teamstack.test",
    status: TicketStatus.closed,
    subject: "Team access for small engineering group"
  },
  {
    body: "The code sandbox for the Node module returns a 502 error.",
    category: TicketCategory.technical_question,
    requesterEmail: "daniel.lee@sandboxops.test",
    status: TicketStatus.open,
    subject: "Code sandbox returns 502"
  },
  {
    body: "I paid for lifetime access but my account still shows monthly billing.",
    category: TicketCategory.refund_request,
    requesterEmail: "evelyn.white@lifetimelearn.test",
    status: TicketStatus.open,
    subject: "Lifetime access payment not reflected"
  },
  {
    body: "I need a letter confirming course hours for my professional development record.",
    category: TicketCategory.general_question,
    requesterEmail: "alexander.hall@pdrecords.test",
    status: TicketStatus.resolved,
    subject: "Course hours confirmation letter"
  },
  {
    body: "The progress tracker dropped from 87 percent to 12 percent overnight.",
    category: TicketCategory.technical_question,
    requesterEmail: "ella.young@progressiq.test",
    status: TicketStatus.open,
    subject: "Course progress reset unexpectedly"
  },
  {
    body: "The discount code was accepted but the final receipt used the full price.",
    category: TicketCategory.refund_request,
    requesterEmail: "jackson.king@discountdesk.test",
    status: TicketStatus.open,
    subject: "Discount code missing from receipt"
  }
];

const additionalSubjects = [
  "Cannot open exercise files from the Docker course",
  "Receipt has the wrong billing address",
  "Need help choosing between React and Next.js courses",
  "Audio is out of sync in the Python fundamentals course",
  "Refund request for unused seat on team plan",
  "Certificate download button is missing",
  "Two-factor code arrives after it expires",
  "Need tax invoice for quarterly renewal",
  "Question about course prerequisites",
  "Lesson transcript shows the wrong module",
  "Billing page says payment pending after successful charge",
  "Can I transfer a course to a colleague",
  "Cannot upload assignment project zip file",
  "Refund for accidental renewal",
  "Need confirmation that course content was updated",
  "Search results do not include enrolled courses",
  "Partial refund for removed team member",
  "Course completion badge not showing on profile",
  "Cannot change email because verification link fails",
  "Need copy of all invoices for finance team",
  "Question about downloading source code",
  "Browser console errors on lesson comments",
  "Refund request after duplicate team invite",
  "Need accessibility accommodations for captions",
  "Practice quiz answers are marked incorrectly",
  "Payment failed but coupon is now marked used",
  "How to pause subscription during leave",
  "Course videos show black screen on Firefox",
  "Refund for purchase made with wrong currency",
  "Need syllabus for manager approval",
  "Login magic link opens a blank page",
  "Invoice should include purchase order number",
  "Question about continuing education credits",
  "Cannot mark lesson as complete",
  "Refund for student discount not applied",
  "Need help resetting team member password",
  "Downloaded project files are corrupted",
  "Subscription cancelled but access ended immediately",
  "Question about monthly versus annual billing",
  "Live workshop calendar shows wrong timezone",
  "Cannot access course after email change",
  "Refund request for company card mistake",
  "Need certificate reissued with accent marks",
  "Video quality selector is not visible",
  "Unexpected sales tax on nonprofit purchase",
  "Question about sharing account with assistant",
  "Course notes are missing from final module",
  "Refund for duplicate PayPal payment",
  "Need progress report for employer",
  "Android app crashes after opening downloads",
  "Cannot redeem gift course link",
  "Refund after course was gifted to wrong email",
  "Question about API course release date",
  "Exercise solution branch does not exist",
  "Need invoice split by department",
  "Certificate verification URL returns 404",
  "Password manager fills old email on checkout",
  "Refund request for abandoned checkout charge",
  "Need help inviting external contractor",
  "Course player skips to next lesson automatically",
  "Refund after regional pricing mismatch",
  "Question about offline access limits",
  "Cannot remove expired card from account",
  "Receipt email never arrived",
  "Need enrollment confirmation for audit",
  "Lab environment stuck provisioning",
  "Refund for accidental upgrade to team plan",
  "Question about course language subtitles",
  "Profile photo upload fails with PNG",
  "Credit card charged in old account",
  "Need admin access for company workspace",
  "Quiz timer starts before quiz loads",
  "Refund after duplicate invoice payment",
  "Question about course completion requirements",
  "Cannot see comments I posted yesterday",
  "Need billing contact changed",
  "Course roadmap link is broken",
  "Refund for cancelled workshop seat",
  "Question about certificate expiration",
  "SSO login redirects to personal account"
];

const requesterEmails = [
  "priya.shah@northstarlearn.test",
  "marcus.green@devcamp.test",
  "nora.evans@courseworks.test",
  "samuel.brown@teamstack.test",
  "grace.walker@skillbridge.test",
  "leo.harris@learnforge.test",
  "zoe.clark@ledgerops.test",
  "aaron.lewis@mobilelab.test",
  "victoria.robinson@quizworks.test",
  "owen.scott@checkoutlab.test",
  "layla.adams@alumnihub.test",
  "julian.baker@safarilearn.test",
  "chloe.nelson@trialdesk.test",
  "isaac.carter@sandboxops.test",
  "aria.mitchell@lifetimelearn.test",
  "gabriel.perez@pdrecords.test",
  "lily.roberts@progressiq.test",
  "sebastian.turner@discountdesk.test",
  "hannah.phillips@trainly.test",
  "mateo.campbell@brightpath.test"
];

function inferCategory(subject: string) {
  const normalized = subject.toLowerCase();

  if (
    normalized.includes("refund") ||
    normalized.includes("charge") ||
    normalized.includes("payment") ||
    normalized.includes("billing") ||
    normalized.includes("invoice") ||
    normalized.includes("receipt") ||
    normalized.includes("coupon") ||
    normalized.includes("tax") ||
    normalized.includes("currency")
  ) {
    return TicketCategory.refund_request;
  }

  if (
    normalized.includes("cannot") ||
    normalized.includes("fails") ||
    normalized.includes("error") ||
    normalized.includes("crashes") ||
    normalized.includes("stuck") ||
    normalized.includes("blank") ||
    normalized.includes("broken") ||
    normalized.includes("missing") ||
    normalized.includes("wrong") ||
    normalized.includes("sync") ||
    normalized.includes("black screen") ||
    normalized.includes("404")
  ) {
    return TicketCategory.technical_question;
  }

  return TicketCategory.general_question;
}

function buildBody(subject: string, category: TicketCategory) {
  if (category === TicketCategory.refund_request) {
    return `${subject}. The customer included order details and needs billing support before month-end reconciliation.`;
  }

  if (category === TicketCategory.technical_question) {
    return `${subject}. The issue happens consistently on a current browser and blocks normal course progress.`;
  }

  return `${subject}. The customer is asking for guidance before continuing with their learning plan.`;
}

const statusCycle = [
  TicketStatus.open,
  TicketStatus.resolved,
  TicketStatus.closed,
  TicketStatus.open,
  TicketStatus.open,
  TicketStatus.resolved
];

const generatedScenarios = additionalSubjects.map((subject, index) => {
  const category = inferCategory(subject);

  return {
    body: buildBody(subject, category),
    category,
    requesterEmail: requesterEmails[index % requesterEmails.length],
    status: statusCycle[index % statusCycle.length],
    subject
  };
});

const aiResolutionSeeds = new Map(
  [
    [
      "sample_ticket_002",
      {
        article: "Refunds and duplicate purchases",
        minutesAfterCreate: 18,
        reply:
          "We found the duplicate annual subscription charge and reversed the second payment. The refund should appear on the original card within 5-10 business days."
      }
    ],
    [
      "sample_ticket_006",
      {
        article: "Course quizzes and completion requirements",
        minutesAfterCreate: 9,
        reply:
          "The TypeScript course includes a short completion quiz at the end of each module and a final review quiz before the certificate unlocks."
      }
    ],
    [
      "sample_ticket_009",
      {
        article: "Invoice and VAT number requests",
        minutesAfterCreate: 14,
        reply:
          "We generated a corrected invoice with the company VAT number and sent it to the billing contact on the account."
      }
    ],
    [
      "sample_ticket_013",
      {
        article: "Caption troubleshooting by browser",
        minutesAfterCreate: 24,
        reply:
          "Captions were reprocessed for the advanced React module. Safari should now show the caption track after a page refresh."
      }
    ],
    [
      "sample_ticket_014",
      {
        article: "Trial cancellation billing policy",
        minutesAfterCreate: 31,
        reply:
          "Your trial cancellation was confirmed before renewal. We voided the charge and restored the account to a cancelled trial state."
      }
    ],
    [
      "sample_ticket_018",
      {
        article: "Professional development hour letters",
        minutesAfterCreate: 42,
        reply:
          "We attached a course-hours confirmation letter that lists the completed modules and total eligible professional development hours."
      }
    ],
    [
      "sample_ticket_025",
      {
        article: "Certificate download troubleshooting",
        minutesAfterCreate: 16,
        reply:
          "The certificate download action was hidden by a stale completion state. We refreshed the record and the download button is visible now."
      }
    ],
    [
      "sample_ticket_035",
      {
        article: "Lesson completion state repair",
        minutesAfterCreate: 27,
        reply:
          "We repaired the lesson completion state for the affected module. You can now mark the lesson complete and continue the course."
      }
    ]
  ] satisfies Array<
    [
      string,
      {
        article: string;
        minutesAfterCreate: number;
        reply: string;
      }
    ]
  >
);

const sampleTickets = [...ticketScenarios, ...generatedScenarios].map(
  (ticket, index) => {
    const createdAt = new Date("2026-07-03T10:00:00.000Z");
    createdAt.setHours(createdAt.getHours() - index * 3);
    const id = `sample_ticket_${String(index + 1).padStart(3, "0")}`;

    return {
      ...ticket,
      createdAt,
      id,
      status: aiResolutionSeeds.has(id) ? TicketStatus.resolved : ticket.status
    };
  }
);

if (sampleTickets.length !== 100) {
  throw new Error(`Expected 100 sample tickets, received ${sampleTickets.length}`);
}

export async function seedSampleTickets() {
  for (const ticket of sampleTickets) {
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      create: {
        id: ticket.id,
        category: ticket.category,
        createdAt: ticket.createdAt,
        messages: {
          create: {
            body: ticket.body,
            direction: MessageDirection.inbound,
            senderEmail: ticket.requesterEmail
          }
        },
        requesterEmail: ticket.requesterEmail,
        status: ticket.status,
        subject: ticket.subject,
        updatedAt: ticket.createdAt
      },
      update: {
        category: ticket.category,
        requesterEmail: ticket.requesterEmail,
        status: ticket.status,
        subject: ticket.subject,
        updatedAt: ticket.createdAt
      }
    });

    const aiResolutionSeed = aiResolutionSeeds.get(ticket.id);

    if (aiResolutionSeed) {
      const resolvedAt = new Date(
        ticket.createdAt.getTime() + aiResolutionSeed.minutesAfterCreate * 60000
      );

      await prisma.aiSuggestion.deleteMany({
        where: {
          ticketId: ticket.id,
          summary: {
            startsWith: "Auto-resolved using KB article:"
          }
        }
      });
      await prisma.aiSuggestion.create({
        data: {
          category: ticket.category,
          confidence: 0.92,
          createdAt: resolvedAt,
          reply: aiResolutionSeed.reply,
          summary: `Auto-resolved using KB article: ${aiResolutionSeed.article}`,
          ticketId: ticket.id
        }
      });
      await prisma.ticketMessage.upsert({
        where: {
          externalId: `sample_auto_reply_${ticket.id}`
        },
        create: {
          body: aiResolutionSeed.reply,
          createdAt: resolvedAt,
          direction: MessageDirection.outbound,
          externalId: `sample_auto_reply_${ticket.id}`,
          senderEmail: "support@moshdesk.test",
          ticketId: ticket.id
        },
        update: {
          body: aiResolutionSeed.reply,
          createdAt: resolvedAt,
          direction: MessageDirection.outbound,
          senderEmail: "support@moshdesk.test"
        }
      });
    }
  }
}
