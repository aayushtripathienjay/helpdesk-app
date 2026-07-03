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
    requesterEmail: "maya.patel@example.com",
    status: TicketStatus.open,
    subject: "Password reset loop on course dashboard"
  },
  {
    body: "I accidentally bought the annual plan twice and need one charge reversed.",
    category: TicketCategory.refund_request,
    requesterEmail: "ethan.brooks@example.com",
    status: TicketStatus.resolved,
    subject: "Duplicate annual subscription charge"
  },
  {
    body: "My certificate still shows my maiden name after I updated my profile.",
    category: TicketCategory.general_question,
    requesterEmail: "sofia.martinez@example.com",
    status: TicketStatus.open,
    subject: "Certificate needs updated legal name"
  },
  {
    body: "The video player freezes every time lesson 14 reaches the recap section.",
    category: TicketCategory.technical_question,
    requesterEmail: "liam.chen@example.com",
    status: TicketStatus.open,
    subject: "Video freezes in lesson 14"
  },
  {
    body: "I selected the wrong course bundle and want to switch or refund it.",
    category: TicketCategory.refund_request,
    requesterEmail: "ava.johnson@example.com",
    status: TicketStatus.closed,
    subject: "Purchased the wrong course bundle"
  },
  {
    body: "Can you confirm whether the TypeScript course includes a completion quiz?",
    category: TicketCategory.general_question,
    requesterEmail: "noah.wilson@example.com",
    status: TicketStatus.resolved,
    subject: "Question about TypeScript course quiz"
  },
  {
    body: "The mobile app downloaded lessons but says they are unavailable offline.",
    category: TicketCategory.technical_question,
    requesterEmail: "isabella.nguyen@example.com",
    status: TicketStatus.open,
    subject: "Offline downloads unavailable in mobile app"
  },
  {
    body: "My employer reimbursed a different training option, so I need to cancel.",
    category: TicketCategory.refund_request,
    requesterEmail: "oliver.smith@example.com",
    status: TicketStatus.open,
    subject: "Refund after employer selected another training"
  },
  {
    body: "I need an invoice with my company VAT number for last month's payment.",
    category: TicketCategory.general_question,
    requesterEmail: "amelia.ross@example.com",
    status: TicketStatus.resolved,
    subject: "Invoice with VAT number"
  },
  {
    body: "The quiz submit button stays disabled after all answers are selected.",
    category: TicketCategory.technical_question,
    requesterEmail: "lucas.kim@example.com",
    status: TicketStatus.open,
    subject: "Quiz submit button remains disabled"
  },
  {
    body: "My bank shows a charge even though checkout displayed an error.",
    category: TicketCategory.refund_request,
    requesterEmail: "mia.thompson@example.com",
    status: TicketStatus.open,
    subject: "Charged after failed checkout"
  },
  {
    body: "Please merge my old student account with my new work email account.",
    category: TicketCategory.general_question,
    requesterEmail: "benjamin.garcia@example.com",
    status: TicketStatus.open,
    subject: "Merge two learning accounts"
  },
  {
    body: "Captions are missing from the advanced React module on Safari.",
    category: TicketCategory.technical_question,
    requesterEmail: "charlotte.davis@example.com",
    status: TicketStatus.resolved,
    subject: "Missing captions on Safari"
  },
  {
    body: "I cancelled during the trial but my card was billed this morning.",
    category: TicketCategory.refund_request,
    requesterEmail: "henry.miller@example.com",
    status: TicketStatus.resolved,
    subject: "Trial cancellation still billed"
  },
  {
    body: "Does the subscription include access for my five-person engineering team?",
    category: TicketCategory.general_question,
    requesterEmail: "harper.anderson@example.com",
    status: TicketStatus.closed,
    subject: "Team access for small engineering group"
  },
  {
    body: "The code sandbox for the Node module returns a 502 error.",
    category: TicketCategory.technical_question,
    requesterEmail: "daniel.lee@example.com",
    status: TicketStatus.open,
    subject: "Code sandbox returns 502"
  },
  {
    body: "I paid for lifetime access but my account still shows monthly billing.",
    category: TicketCategory.refund_request,
    requesterEmail: "evelyn.white@example.com",
    status: TicketStatus.open,
    subject: "Lifetime access payment not reflected"
  },
  {
    body: "I need a letter confirming course hours for my professional development record.",
    category: TicketCategory.general_question,
    requesterEmail: "alexander.hall@example.com",
    status: TicketStatus.resolved,
    subject: "Course hours confirmation letter"
  },
  {
    body: "The progress tracker dropped from 87 percent to 12 percent overnight.",
    category: TicketCategory.technical_question,
    requesterEmail: "ella.young@example.com",
    status: TicketStatus.open,
    subject: "Course progress reset unexpectedly"
  },
  {
    body: "The discount code was accepted but the final receipt used the full price.",
    category: TicketCategory.refund_request,
    requesterEmail: "jackson.king@example.com",
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
  "priya.shah@example.com",
  "marcus.green@example.com",
  "nora.evans@example.com",
  "samuel.brown@example.com",
  "grace.walker@example.com",
  "leo.harris@example.com",
  "zoe.clark@example.com",
  "aaron.lewis@example.com",
  "victoria.robinson@example.com",
  "owen.scott@example.com",
  "layla.adams@example.com",
  "julian.baker@example.com",
  "chloe.nelson@example.com",
  "isaac.carter@example.com",
  "aria.mitchell@example.com",
  "gabriel.perez@example.com",
  "lily.roberts@example.com",
  "sebastian.turner@example.com",
  "hannah.phillips@example.com",
  "mateo.campbell@example.com"
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

const sampleTickets = [...ticketScenarios, ...generatedScenarios].map(
  (ticket, index) => {
    const createdAt = new Date("2026-07-03T10:00:00.000Z");
    createdAt.setHours(createdAt.getHours() - index * 3);

    return {
      ...ticket,
      createdAt,
      id: `sample_ticket_${String(index + 1).padStart(3, "0")}`
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
  }
}
