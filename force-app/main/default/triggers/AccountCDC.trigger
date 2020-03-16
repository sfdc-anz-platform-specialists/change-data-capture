trigger AccountCDC on AccountChangeEvent (after insert) {
    list<id> recordIds = new list<id>(); //list to bulkify our query/update
    for (AccountChangeEvent event : Trigger.New) { // can come as a set of events if a single transaction produced a set of changes on the same object
           recordIds.addAll(event.ChangeEventHeader.getRecordIds()); // get record ids from the event
    }
    list<account> accountsToCheck = [select id, description from account where id in: recordIds]; //get those records in one query so we can update them with one DML
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