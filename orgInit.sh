sfdx force:org:create -f config/project-scratch-def.json -d 5 -s
sfdx force:source:push
sfdx force:user:password:generate
sfdx force:org:open
