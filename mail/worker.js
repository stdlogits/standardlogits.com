// standardlogits.com's catch-all. Email Routing forwards a rule to one address, so mail to any address
// without its own rule comes to this Worker, which forwards it to both of us. Both addresses must be
// verified destinations in the account.
const TO = ["mx@a9l.im", "hi@logits.ml"];

export default {
  async email(message) {
    await Promise.all(TO.map((to) => message.forward(to)));
  },
};
