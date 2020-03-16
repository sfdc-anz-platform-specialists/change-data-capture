({
    doInit : function(component) {
        // Get the empApi component
        const empApi = component.find('empApi');

        // Uncomment below line to enable debug logging (optional)
        // empApi.setDebugFlag(true);

        // Register error listener and pass in the error handler function
        empApi.onError($A.getCallback(error => {
            // Error can be any type of error (subscribe, unsubscribe...)
            console.error('EMP API error: ', error);
        }));

        if (component.get('v.channel')) {
            empApi.subscribe(component.get('v.channel'), component.get('v.replayId'), $A.getCallback(eventReceived => {
                // Process event (this is called each time we receive an event)
                console.log('Received event ', JSON.parse(JSON.stringify(eventReceived)));
    if (eventReceived.data.payload.ChangeEventHeader.changeType === 'CREATE') {
    $A.get("e.force:showToast")
        .setParams({
            "title": "Record Created!",
            "message": eventReceived.data.payload.Name
        })
       .fire();
}
            }))
            .then(subscription => {
                // Confirm that we have subscribed to the event channel.
                // We haven't received an event yet.
                console.log('Subscribed to channel ', subscription.channel);
                // Save subscription to unsubscribe later
                component.set('v.subscription', subscription);
            });
        }
    },

})