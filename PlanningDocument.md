# Clipless


## Table of Contents

- [Requirements](#requirements)
- [Clip Compile Templates](#clip-compile-templates)
- [Quick Clip Launch](#clip-quick-launch)

## Requirements

- Will record 10-* previous clipboard contents and display them.
- Will allow for configurable hotkeys to quickly paste the contents of a previous clip
- Will allow for a previous clip to be "locked", maintaining its current contents while others will continue to update as clipboard changes.
- Will allow any clip to be edited, allowing the user to modify its contents.
- Will allow for "[Clip Compile Templates](#clip-compile-templates)" functionality
- Will allow for "[Quick Clip Launch](#clip-quick-launch)" utilities


## Technology

- Electron
- 


## Clip Compile Templates

Use an easy to understand syntax to allow users to save what will be call "compile templates", which will allow them to provide a template to quickly compile multiple clips into a re-usable template.

### Example

Say someone who works in a call center has to contact another department frequently, and they normally provide the information via their companies internal chat system.
They could create a template like this:
```
Customer Name: {c1}
Callback #: {c2}
Account ID: {c3}
Product with Issue: {c4}
```

They could then set a hot key for when to use this template to compile a new message, where `{c1}`, `{c2}`, etc represent the contents of that numbered clip.
They would then go thru their normal procedure of copying customer data to their clipboard in the order in which they require to match their template, and use the hotkey to paste the compiled message into the currently active window. It would look something like this.

```
Customer Name: Susy Q
Callback #: 555-555-5555
Account ID: 123456
Product with Issue: some-unique-identifier
```

**These templates should be easily exported and imported into the program.**

**NOTE:** When combined with the ability to "lock" a clips contents, you could use Clipless as part of your note taking process, where one of your clips always contains your current notes for the task at hand, to be used in your compile template.

## Quick Clip Launch

In any office environment, there are usually various tools with which you use to look up data about a customer or client. The majority of which are web based, where relevant search data can be passed via the tools URI, such as google: `https://www.google.com/search?q=my%20search%20string`
The "Quick Clip Launch" feature aims to expediate the time and effort used to use your existing tools by allowing the user to configure *"search strings"* using **Regular Expressions** (a sample library of which will be included) with named capture groups to be ran against your clipboard contents. For example, you could look for twitter handles:

```javascript
/\s(?<twitter_handle>\@[a-z0-9]+)\s/gmi
```

This regex would then be used to check against clipboard contents and prompt user of any matches.

The user can then identify what tool they would like to launch when these search strings are found. by providing URI's during configuration, such as with the twitter handle example above: `https://www.twitter.com/{twitter_handle}` where `{}` is used to indicate where the capture group of the same name's data should be placed.

The user experience once configured should be as follows:

1. User copies data which may contain items of interest that they have search strings configured for.
    - User Preference could be used to scan all new clipboard contents and prompt when matches are found.
2. User then reviews matched items found, and selects the ones they would like to open in their configured tools.
    - User can select multiple, as each search string could be associated with multiple tools.
3. User is then presented with the tools configured to be associated with the selected found items, they can then select all of the tools they would like to open the found item with.
    - All selected items will be launched with any associated tool which was chosen.
4. User clicks "launch" and all associated tools which were chosen will be opened for each of the selected search string items which were found.
    - User could copy a domain name and open it in as many different diagnostic tools as they can think of all with a single flow.

**These search strings and tools with which to open them should be easily exported and imported into the program**

