/**
 * Builds the WhatsApp Flow JSON for the Interest Capture flow.
 *
 * Single terminal screen — user picks Interested / Not Interested and
 * taps Submit which closes the flow immediately via 'complete' action.
 * The nfm_reply is handled in webhook.js.
 */
function buildInterestFlowJSON() {
  return {
    version: '7.0',
    data_api_version: '3.0',
    routing_model: {
      INTEREST_SELECT: [],
    },
    screens: [
      {
        id: 'INTEREST_SELECT',
        title: 'Secure Your Spot',
        terminal: true,
        success: true,
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
                name: 'complete',
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
    ],
  };
}

module.exports = { buildInterestFlowJSON };
