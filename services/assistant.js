/**
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger For Original Coast Clothing
 * https://developers.facebook.com/docs/messenger-platform/getting-started/sample-apps/original-coast-clothing
 */

"use strict";
const { name } = require("ejs");
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
    , use the message contents to fill up the value of order and should follow this format: \
      {\
      'cashier': `XXXX`,\
      'order': \
      {\
      'name':'XXXXXXXXXXXX',\
      'items': { 'item_1': 'item_1_quantity', 'item_2': 'item_2_quantity', ...},\
      'Payment Type': 'XXXX',\
      'time': 'XXXX',\
      'Note': 'XXXXXXXXXXXX'}. \
      }\
      Get the name, items, payment type, time, and note from the message content.\
      If the customer has not provided the payment type and order, ask the customer to provide the missing values."},
    {role: "user", content: `${message}`}]
    });

  if (response.choices && response.choices.length > 0 && response.choices[0].message) {
    try {
      const messageContent = JSON.parse(response.choices[0].message.content);
      let cashier = '';
      let name = '';
      let items = [];
      let time = '';
      if (messageContent.order.name != undefined || messageContent.order.name != null || messageContent.order.name != '') {
        name = messageContent.order. name;
      }
      if (messageContent.order.time != undefined || messageContent.order.time != null || messageContent.order.time != '') {
        time = messageContent.order.time;
      }
      if (messageContent.order.items != undefined || messageContent.order.items != null || messageContent.order.items != '') {
        items = messageContent.order.items;
      }
      if (messageContent.cashier != undefined || messageContent.cashier != null || messageContent.cashier != '') {
        cashier = messageContent.cashier;
      }
      return `${cashier}`;
    } catch (error) {
      console.error("Error parsing JSON response:", error.message, response.choices[0].message.content);
      // Handle error appropriately, e.g., return a default response
      return "An error occurred while processing your message.";
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