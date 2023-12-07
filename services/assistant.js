/**
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger For Original Coast Clothing
 * https://developers.facebook.com/docs/messenger-platform/getting-started/sample-apps/original-coast-clothing
 */

"use strict";
const GraphApi = require("./graph-api"),
config = require("./config"),
OpenAI = require("openai");

const openai = new OpenAI({ apiKey: config.gptApiKey, });
module.exports = class Assistant {
constructor() {
  this.context = {};
}

  async getMessages(page_scoped_user_id = 6796435330393535) {
  try {
    // Make an API call to Conversations API and await its resolution
    const data = await GraphApi.getConversations(page_scoped_user_id)
    //console.log('From getMessages, Received data:', data);
    // Process data
    const messages = data.data[0].messages.data;
    // Format messages
    let role = ``;

    var formattedMessages = messages.map(message => {
    if (message.from.name.startsWith('Icy Threads')) {
      role = `assistant`;
    } else {
      role = 'user';
    }
    return {
      role: role,
    content: `My name is ${message.from.name}, ${message.message}, time written: ${message.created_time}`,
      time: message.created_time
    };
    });

    // Get the date of the first (latest) message
    const firstDate = new Date(formattedMessages[0].time).toISOString().slice(0, 10);

    // Find the index where the date changes
    let index = formattedMessages.findIndex(
    (element) => new Date(element.time).toISOString().slice(0, 10) !== firstDate
    );

    // If the date changes, remove the messages after the date change.
    if (index !== -1) {
    formattedMessages = formattedMessages.slice(1, index); // Remove the first message (the greeting message) and the messages after the date change
    }

    // Remove the "time" key from all arrays
    const filteredMessages = formattedMessages.map(({ role, content }) => ({ role, content })).reverse();

    //console.log('From getMessages, filteredMessages:', filteredMessages);
    return filteredMessages;
    
  } catch (error) {
    console.error("Error calling Conversations Graph API:", error.message);
    // Handle error appropriately, e.g., return a default response
    return [];
  }
  }       

  async generateGptResponse(message, user, previousMessages = []) {
  try {
  // Make an API call to OpenAI GPT
  const previousMessages = await this.getMessages(user.psid);
  console.log("previousMessages: ", previousMessages, "PSID: ",user.psid);
  const response = await openai.chat.completions.create(
    {
    model: "gpt-3.5-turbo",
    messages: [...previousMessages,
    {role: "system", content: "You/Assitant will STRICTLY reply in json, with two keys: cashier and order. The value of the cashier key is the message on how you would normally reply as a cashier \
    ,and the value of the order key is from the order and should follow this format: \
      {\
      cashier: `XXXX`,\
      Order: {Customer : XXX,\
      Order: { order1: order1_quantity, order2: order2_quantity, ...},\
      Tower: XXXX,\
      Total: sum(ordern_price*ordern_quantity),\
      Payment Type: XXXX,\
      Note: XXXXXXXXXXXX}. \
      If the customer has not provided the values to each key, ask the customer to provide the missing values. \
      If the customer has provided the values to each key, ask the customer to confirm the order.\
      If the customer confirms the order, reply with {order: confirmed}. \
      If the customer does not confirm the order, reply with {order: not confirmed}. Always reply in json"},
    {role: "user", content: `${message}`}]
    // Add other parameters as needed based on your requirements
    }
  );
  // Return the response from the API call

  if (response.choices && response.choices.length > 0 && response.choices[0].message) {
      const messageContent = response.choices[0].message.content;
      try {
      var jsonObject = JSON.parse(messageContent);
      return messageContent;//jsonObject.cashier, jsonObject.order;
      } catch (e) {
      return messageContent;
      }
  }
  else {
  return `An error occurred while processing your message, ${response.choices[0].message.content}.`;
  }
  } catch (error) {
  console.error("Error calling GPT API:", error.message, response.choices[0].message.content);
  // Handle error appropriately, e.g., return a default response
  return "An error occurred while processing your message.";
  }
  }
}