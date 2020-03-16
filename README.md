

Abstract: 

Salesforce has enabled a bunch of new features for Event Driven Architectures.  During this workshop, we'll activate Change Data Capture and use change events in 3 different scenarios: reactive Salesforce UIs, asynchronous triggers, and apps running outside of Salesforce.  


Script



Introduction

Over the last few years, Salesforce has been opening up a lot of new options for streaming events.  You've possibly played with push topics, generic streaming, or platform events.  https://salesforce.quip.com/KDcXAkwyIOzv

We've recently introduced a new one, Change Data Capture (CDC).  CDC

* publishes a message when data in Salesforce changes
* messages contains the changes

Our workshop will look at 3 categories of things you'll want to do with CDC.

Get an org from here: https://lightning-platform-workshops.herokuapp.com/tdx19dev and *Create Org* from the CDC workshop

It'll launch a deployer page with your username and password. _ DO NOT CLOSE THIS TAB_...we'll need those credentials for step 3.

When it's done, click the *Launch* button and you'll be in Setup.


Activating CDC

This could not be any simpler.  Change Data Capture can be found by searching the setup menu.  

*Setup* > *Change Data Capture*

Then you just select the object you want to enable it on.  Let's pick *Accounts, Contact*

It works on custom objects, and most standard objects.

Be sure to *Save.*
[Image: Screen Shot 2019-04-22 at 3.27.15 PM.png]That's it.  You can't publish a CDC Event...they happen automatically when data is changed (insert, update, delete, undelete).

Use case #1: Real-time notifications and UI

Let's open app builder.  [Setup > App Builder > New > App Page]
Label it *Notifications.  Next.*
select *One Region*

Drag the cdcDemo component onto the page.  
Its default channel is set to /events/ChangeEvents.  That's the “every change data capture event” channel.
It's replayId is set to -1...that means “show me all new events as they come in”.  We'll see replayId when we look at an event.
*Save*
*Activate*
*for All Users*
*Save*
*Finish*
[Image: Screen Shot 2019-04-22 at 4.14.38 PM.png]
Let's see the component in action.  *Waffle Menu/App Launcher > Notifications*
Click the dropdown beside Accounts, and open “New Account” in a new tab
Name your account whatever you like, and add any additional information, then *Save.*

Back on the notifications tab, open the browser console (cmd-option-i).  Let's take a look at what we get.

click the dropdown beside *Received event* to open the event.  You'll see a sequential replayId that's used for tracking each event.
[Image: Screen Shot 2019-04-22 at 4.40.08 PM.png]click on payload.  You'll see all the fields that were changed as part of transaction.
[Image: Screen Shot 2019-04-22 at 4.40.41 PM.png]
click on *ChangeEventHeader* to get metadata about the change.  This tells us that it was an *Account*, was a *Create*, etc.
[Image: Screen Shot 2019-04-22 at 4.41.10 PM.png]Gear > Dev Console > File > Open Lightning Resource > c:cdcDemo > Open Selected
then click on the Component in the sidebar

This isn't a component building workshop, so we'll keep this brief and use an Aura component so we can look at it together in the dev console.  Side note: this totally works in LWC, but those aren't supported in the dev console, so we're using Aura for simplicity.  Here's the magic line to bring the streaming api into a UI component.  [point this out on the code]

    <lightning:empApi aura:id="empApi" />

[click on the controller]
and here's the magic subscribe logic.  You can see that we're just logging it to the console (we saw that earlier, but we can do anything else with it)

empApi.subscribe(component.get('v.channel'), -1, $A.getCallback(eventReceived => {

let's add a notification on the screen for new accounts inside the empApi.subscribe callback, right under the console.log('Received event ')

if (eventReceived.data.payload.ChangeEventHeader.changeType === 'CREATE') {
    $A.get("e.force:showToast")
        .setParams({
            "title": "Record Created!",
            "message": eventReceived.data.payload.Name
        })
       .fire();
}

...and Save it.  Notice we didn't specify that it has to be an account.  We'll change the channel to accomplish that.

Back on our Notifications app, *Gear* > *Edit Page*
Click on our component, and set the *channel *to* /data/AccountChangeEvent*.  This listens only to changes on Accounts.  Every object has its own CDC Event type.
change the *replayId* to -*2*.  This gives us all the events so far, plus new ones.
*Save, Back*
[Image: Screen Shot 2019-04-22 at 5.23.54 PM.png]Create an account, and very quickly switch back to your notification screen and you'll see our notification fire.
[presenter note: putting tabs in half-screen so you can have both on at the same time is also cool].

Because this is running in the user's browser, you can pretty much do anything javascript can do (ring a bell when an opportunity closes or or play party music when a case survey gets a perfect score).

You also see the power of the replayId.  This is useful if a consumer (browser or server, as we'll see later) needs to go offline  and get caught up after coming back online, or know about previous events before processing new events.  They can also track their most recent replayId and re-subscribe to messages after that replayId (what they missed)

Use case #2: Async triggers

Besides UI that reacts to events, you might want processes to react to record changes.  Normally, for devs, that's an apex trigger on create/update.

But....sometimes, you have a lot going on in a trigger.  You might hit limits OR maybe just make a user wait for a while.  You can _could_ move some of that work to future or queueable apex, but CDC gives developers a new option...write a trigger on the CDC event!

Setup > Dev Console > File > New > Apex Trigger

New in Summer19, you'll see Objects and their related Change Events.

Name your trigger “AccountCDC” and Select the AccountChangeEvent sObject.

*Submit*
[Image: Screen Shot 2019-04-22 at 5.31.12 PM.png][Image: Screen Shot 2019-04-22 at 5.31.56 PM.png]CDC triggers only have insert... (this is a bit confusing, but Change Data events are only ever inserted.  You might update or delete an account, but that still inserts a Change Data Event).

You have trigger.New like normal (but remember, it's a list of CDC Events, not a list of Account records).  Add the following to your trigger

trigger AccountCDC on AccountChangeEvent (after insert) {
    list<id> recordIds = new list<id>(); //list to bulkify our query/update
    for (AccountChangeEvent event : Trigger.New) { // can come as a set of events if a single transaction produced a set of changes on the same object
           recordIds.addAll(event.ChangeEventHeader.getRecordIds()); // get record ids from the event
    }
    list<account> accounts = [select id, description from account where id in: recordIds]; //get those records in one query so we can update them with one DML
    list<account> accountsToUpdate = new list<account>();
    for (account a:accountsToCheck) {
        // Only update description if it needs it
        if(a.description != 'CDC was here')
        {
            a.description = 'CDC was here';
            accountsToUpdate.add(a);
        }
    }
    update accountsToUpdate;
}

Remember, a CDC event will contain any modified fields, but only if they were modified, so you might need to do a query of the records to guarantee that field has a value.

Of course, this'll change how we do testing, too. [show the following link]
https://releasenotes.docs.salesforce.com/en-us/summer19/release-notes/rn_change_event_triggers.htm?edition=&impact=

There's new apex methods like *Test.enableChangeDataCapture()* to turn it on for an object, and *Test.getEventBus().deliver()* to insert those CDC events after you've created/modified some records.

Let's see it in action.  Create an Account.  Depending on how quickly the event trigger runs, your record may or may not have the Description field completed.  Reload the record if not, and see that it completes.

[Image: Screen Shot 2019-04-22 at 6.57.33 PM.png]You'll also note the CDC triggers run as a special user.

Use case #3: Apps running anywhere else

So far, we've looked at Salesforce events consumed by Salesforce (UI or processes).  CDC is also super-awesome for external apps.

Here's a web app, built with nodes, express, and Vue.js, which can run anywhere.  [TBD: show the code!]

go to https://heroku-cdc-demo.herokuapp.com (https://heroku-cdc-demo.herokuapp.com/) in an incognito window
[Image: Screen Shot 2019-04-24 at 10.19.51 AM.png]Login with the credentials from your scratch org (username password from the deployer page).  Do not use your production salesforce credentials or any other org.  It needs to be the scratch org where we turned on CDC.
[Image: Screen Shot 2019-04-24 at 10.21.11 AM.png]Approve for this app to connect to your org
[Image: Screen Shot 2019-04-24 at 10.21.39 AM.png]You should be able to verify that the domain you're approving to matches the one on your scratch org.  If not, it's trying to use an existing session on a different org (and you won't see messages coming from your scratch org).
[Image: Screen Shot 2019-06-25 at 8.19.52 AM.png]
You'll see a *No messages* area.  
Make changes to accounts or create some new ones in your scratch org.  You'll see the events flowing in the CDC Demo App.
[Image: Screen Shot 2019-04-24 at 10.24.16 AM.png]How did this work?  [open the github repo (https://github.com/mshanemc/heroku-cdc-demo/blob/master/app.js) for this demo app]
We're using a nodejs library called jsforce (https://jsforce.github.io/) to handle things like authenticating and subscribing to the streaming API (where push topics, platform events, and CDC events come from).

Once you login `app.post('/sessionId'`, the app stores your credentials and redirects you to the events page with your orgId.

the events page app.get('/events/:orgId' subscribes to the platform events channel and emits web socket messages to the vue.js client, which puts them on your screen.

The client/screen is completely optional...our nodejs server could take any action we want with these messages.

Integration tools like MuleSoft are another obvious use case...listen for some data change in Salesforce, and then start some integration flow (enrich the data in Salesforce with external data, update another system via some API connector, etc).  Mule has a connector for CDC Events, so it's easy to take actions in other connected systems when data changes in Salesforce. 


Conclusion: 

Asking an Admin to turn on CDC for an object is a pretty low-calorie request.  But it opens up a lot of cool use cases, both on-platform and off.  

[Limits link] https://developer.salesforce.com/docs/atlas.en-us.change_data_capture.meta/change_data_capture/cdc_allocations.htm 

There's some important considerations—you're limited in the number of concurrent clients (1000 for Enterprise, 2000 for Unlimited) for all streaming api connections so certain high concurrent user scenarios aren't addressable today.

Orgs come with CDC events: 50k or 25k day delivered (enterprise, unlimited), and you can activate CDC on 5 objects.  If you need more, there's an add-on for purchase.  Developers org like we're using today have lower limits, but let you play for free.

As you're creating UI, processes, and multi-cloud systems, keep CDC in mind for situations where it can really reduce code, improve performance, and simplify architecture.
