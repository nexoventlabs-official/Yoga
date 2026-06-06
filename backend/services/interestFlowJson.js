/**
 * Builds the WhatsApp Flow JSON for the Interest Capture flow.
 *
 * This is a simple 2-screen flow:
 *   INTEREST_SELECT  — show course summary + Interested / Not Interested radio
 *   INTEREST_CONFIRM — terminal thank-you screen
 *
 * The flow is opened via a flow message with a PDF document header.
 * On completion, the webhook receives nfm_reply with kind=interest_response.
 *
 * Version: 7.0, Data API: 3.0, Mode: Endpoint (data_exchange)
 */
function buildInterestFlowJSON() {
  return {
    version: '7.0',
    data_api_version: '3.0',
    routing_model: {
      INTEREST_SELECT: ['INTEREST_CONFIRM'],
      INTEREST_CONFIRM: [],
    },
    screens: [
      /* ─── INTEREST_SELECT ─── */
      {
        id: 'INTEREST_SELECT',
        title: 'Secure Your Spot',
        data: {
          course_summary: {
            type: 'string',
            __example__: 'Yoga Teacher Training — 200hr TTC\n01 Jun – 01 Jul 2026\nFee: ₹45,000',
          },
          booking_id: { type: 'string', __example__: '6a23b9bee0b30a94d554e7f1' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'TextBody',
              text: '${data.course_summary}',
            },
            {
              type: 'RadioButtonsGroup',
              name: 'interest',
              label: 'Are you interested in securing your spot?',
              required: true,
              'data-source': [
                { id: 'interested', title: 'Interested 🙋' },
                { id: 'not_interested', title: 'Not Interested ❌' },
              ],
            },
            {
              type: 'Footer',
              label: 'Submit',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  kind: 'interest_response',
                  interest: '${form.interest}',
                  booking_id: '${data.booking_id}',
                },
              },
            },
          ],
        },
      },

      /* ─── INTEREST_CONFIRM (terminal) ─── */
      {
        id: 'INTEREST_CONFIRM',
        title: 'Thank You',
        terminal: true,
        success: true,
        data: {
          message: {
            type: 'string',
            __example__: 'Thank you! We will be in touch shortly.',
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: 'Thank you! 🙏' },
            { type: 'TextBody', text: '${data.message}' },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': {
                name: 'complete',
                payload: {},
              },
            },
          ],
        },
      },
    ],
  };
}

module.exports = { buildInterestFlowJSON };
