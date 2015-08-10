## rsvp

This node server collects RSVPs from a web form and sends them to email.

It provides a route

    /rsvp

that accepts posted JSON data in the form:

```json
{
  "name": "Samuel Clements",
  "message": "Hey, I'm in!",
  "coming": true
}
```
