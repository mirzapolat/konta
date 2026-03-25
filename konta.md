# General Description

Konta is an application for managing events, invites, rsvp, attendance tracking, analytics. The goal is to ensure shared accountability between event organizers and (possible) attendees.

# Language and User Experience

The entire app should be created in such a way that bilingual ui is possible. everything is in english and in german. the language is selected automatically on app load using the browsers language settings but can be changed manually. language choice is remembered across sessions using cookies.

# Database Tables
The database runs on a self hosted supabase. create a supabase directory with everything i need to deploy migrations and edge functions.  before creating the databases, read the entire document to figure out if anything conflicts or can be solved better.

### General

profiles
(identifies users)
- id: linked to supabase authentication
- name: full name text
- email: text
- timestamp created account
- timestamp last logged in

profiles_logs
(stores activity regarding profile changes)
- id: uuid
- timestamp
- profile_id: linked to profiles
- content: json (stores a log of what changed with the profile, e.g. name change to what, password change, email changed to what, joined workspace, left workspace, got removed from workspace, created workspace, deleted workspace)

workspaces
(workspaces share permissions with other users over the same projects)
- id: unique uuid
- name: text
- branding: json (just a link to a logo for now)

workspaces_logs
(stores logs of activity in workspaces)
- id uuid
- timestamp
- workspace_id
- content: json (stores a log of what changed, e.g. name change, branding change, member invited, member joined, member leave, member removed, ownership transferred)

workspace_members
(stores which profiles have which role in workspaces)
- workspace_id
- profile_id
- status: text (owner, member, invited)
- updated: timestamp

projects
(objects, that help with organizing objects into folders with hierarchy)
- id
- workspace_id
- parent_id: id of parent project, or something else if it is directly in root of workspace.
- name: text
- hasChilden: integer (counting the amount of objects directly children of this directory to make processing faster. leave out if you don't think that is good practice)
projects can contain other objects.

### Attendance checking functionality

attendance_objects
(objects, that are used to track attendance in an event)
- id
- workspace_id
- parent_id
- created_by: reference to profile which created this
- name
- timestamp of event date
- timestamp when it was created
- timestamp when it was last updated
- fields: json. all the fields that members in this event have with name and their value type (text, email, telephone number, list select) so it can be expanded with new types whenever i want. default are name and email adress. these are the things that they can enter when they scan the qr code
- active: bool
- security_rotatingcode_enabled: bool
- security_rotatingcode_interval: int in seconds
- security_clientidchecks_enabled: bool
- security_clientidchecks_type: strict, warning
- email_receipts: bool

attendance_codes
(stores qr codes for all events)
- id (is uuid but works also as token for the code)
- event_id: reference to attendance object
- type: static / rotating
- timestamp created
- timestamp expires

attendance_records
(stores all attendance records)
- id: uuid
- event_id_ reference to attendance_object
- recorded-at: timestamp
- content: json (uses all fields that are defined as fields in the event and has values for all the fields that respect the types defined in field-attribute of attendance object)
- status: attended, excused
- recorded_with: qr (scanned rotating code), link (static code or link copy), manual (entry by workspace admin), moderator (entry by moderator)
- client_id: id of client (cookies)
- client_id_collision: id of record it collides with

attendance_moderation
(stores all moderation links)
- id: is uuid and is also used for the link token
- event_id: reference to attendance_object
- label: text
- active: bool
- timestamp of creation
- timestamp of expiration

attendance_excuselinks
(stores all the excuse links)
- id: uuid that is used as link token
- event_id: reference to attendance_object
- label: text
- active: bool
- timestamp created
- timestamp expires

### RSVP

rsvp_objects
(objects that are used for taking signups/rsvp forms)
- id: uuid
- workspace_id
- parent_id
- created_by: reference to profile which created this
- name
- event_date: timestamp
- timestamp when it was created
- timestamp when it was last updated
- fields: json with everything the user gets asked when they fill out the rsvp form. all field names and their value types are stored here. value types can be text, email, number, phone number, select from list, date select, check box. every field has name, description and the input type.
- active: bool
- email_receipts: bool

rsvp_links
- id: uuid that doubles as link token
- label: text
- timestamp when it was created
- count how many times it was opened
- count how many times it was filled from that link
- active: bool

rsvp_records
- id: uuid
- rsvp_id
- submitted_at
- content: json (uses all fields that are defined as fields in the rsvp and has values for all the fields that respect the types defined in field-attribute of rsvp object) 
### Series Analysis Functionality

series_object
- id: uuid
- workspace_id
- parent_id
- created_by: reference to profile which created this
- name: text
- timestamp created
- timestamp updated
- combine_on: text (name of the field that is combined on. default is email, if exists)

series_events
- series_id: reference to series
- event_id: reference to attendance object
- weight: integer

series_collisions
- id: uuid
- series_id
- field_name: text
- first_value: text (first conflicting value)
- second_value: text (second conflicting value)
- chosen_value: text
- timestamp of dismissal
- dismissed_by: reference to profile which dismissed/combined/chose this collision

series_review_links
- id: uuid that is used as link token
- series_id
- label: text
- active: bool
- show_graph: bool
- member_review: deactivated, own_public, own_email, all_public, all_email

series_review_logs
- id: uuid
- series_id
- timestamp of review request
- email

# How the app works

## Dashboard

The user can create an account or log in. Using name, email and password or google login. when using normal email and password a confirmation email is send and they have to enter the code in the following page or click the link in the confirmation email. the confirmation email has a warm and welcoming design. the current logged in user session is stored so when they try to log in and the session is still active, they get asked if they want to continue with that account or use a different account. they are always completely logged out when logging out manually.

After Login, they get to the app. It has a sidebar on the left that is collapsable. on the top of the sidebar the currently open workspace is shown with brand logo and name and they can open a workspace selector by clicking on it. above that there is the logo and text of the application, nice. below there are pages in the sideline: Projects, Members, Settings. Under projects hierarchic sub projects are Attendance, Series and RSVP. On the very bottom of the sidebar there is account settings, and above that a support this app button where the user can donate. when clicking it a stipe payment link is opened in a new tab.

The Projects page has a database list view. it works like a file hierarchy directory ui. the user can create attendance tracking objects, rsvp objects, series analysis objects everywhere or they can create projects in projects as many as they like. projects work like directories with infinitely possible nesting directories or other objects. Every object type has their own icon to distinguish it from other types.

The members page has a database view of all the members in the workspace. there is one owner of the workspace (the one who created it) and multiple members. every member has full access to everything in the workspace. but they can not remove other members, just leave on their own. they can also not change the workspace settings, only see them. owners can change all settings, remove other members and invite members to the workspace.

The settings page has all the settings of the workspace. Name, branding logo url, delete the workspace, clear the workspace, remove all members of the workspace.

on the bottom of the sidebar there are notifications "Notifications" and account settings "Account". On notifications the user gets notified if someone invited them to a workspace of notified if someone joined the workspace since they last logged in. On account settings they can change their name, email, password, or delete their account. on their first account creation login a default workspace is created and chosen. an account can never have no workspaces. there has to be one at all times.

## Event Attendance

when selecting an "Event Attendance" Object, open it. When opened there is a secondary sidebar. The Check-in page displays a box with a qr code and four counter boxes (total, excused, checked-in, collision) which count the check ins with a nice animation when the number goes up. the event can be started and stopped. when the event is stopped no qr code is visible, when it is started there is a qr code that rotates every 10 seconds. the seconds are displayed and after the next code is generated, the old code is still valid for 10 more seconds (so 10 seconds in total, and the codes validity overlap). there is a fullscreen mode where only the qr code and the counter boxes are shown or the counter boxes can be hidden toggle. when going into fullscreen the entire website goes into fullscreen too. and the qr code is in the center of the page but still a good size, not too big not too small. when scanning the qr code, people get to the attendance form where they can enter their details and submit. the submission happens with a really nice and beautiful animation. after submission they are shown a confirmation screen and can click a button to save their submission. the next time when they open a form that has the exact same fields, their submissions are prefilled so they dont have to type it out. client ids are generated on the devices that open the attend page and stored permanently so it can be tracked if someone wants to submit twice. in the qr code show the brand logo of the workspace if one is set. show the logo also on the attend form that people see when they scan. also show the name, date, time (24h format) of the event.

it will be possible for multiple clients to open the same event details page at the same time. make that when event is startet at one client it is started everywhere instantly. use realtime for that. also if there are rotating qr codes, make that they sync across all clients at the same time. make that clients can join and leave however they want. but if the last client leaves, stop the event after a warning (if it is on rotating qr codes, not when qr codes are static).

in the event details sidebar, below check-in there is also a page for "Attendance" that displays a database view of all the checked in members. columns name, email, date, time, status (checked-in/excused) are displayed. records can be toggled from excused to checked-in an back with a quick action button or deleted. there are export options as csv (exports name, email, status, timestamp) and import options as csv or as manual bulk entry of emails in a popup menu. also members can be added manually as checked-in or excused. make it easy to add manually. also add filter buttons to filter for checked-in/excused/collision.

in the event details sidebar, also add a page for "Excuse Links". the user can create many multiple excuse links with a label and an optional expiration date. links can be individually turned on or off or deleted. when opening an excuse link, show a public form where people can submit an attend-like form but the submissions are flagged as excused in status of the attendance records. 

below in the sidebar add a page for "Moderation". Moderation Links are a feature to give acces to third partys whithout an account that are not members of the workspace to see the qr code live and also see the live attendance list. but they can only modify the attendance members. add them individually, remove them individually, change their status to excused and back. the idea is that the overview over the event check ins can be delegated without giving access to the account or something else. moderation links can be created with a name, an optional expiriy date. they can be individally deleted or disabled.

on the event settings page "Settings" all the settings regarding this (Attendance-)Event can be changed. The name, date and time can be changed. the branding can be disabled (default enabled) so the qr code and the forms do not show the brand logo. the fields of the event can be edited. default fields are name and email. but there are other fields that can be added. also it can be edited which fields are shown in the database view of attendance records in the table and which not. every form shows the fields that are set here. if fields are changed but there are already attendance records, inform the user that information will be deleted and can not be restored if fields are deleted. or that they need to set a default value for all the records that have not had this field in the past.

Then there are security settings: rotating code codes can be switched off/on (default on). if they are switched off the codes are static. this means that they do not change. even if the event is stopped and started again. the check-in page then shows this qr code and two buttons: copy link for copying the link of the qr code to send it manually and download jpg to download an image of the qr code. in the downloaded image still show the embedded logo and display the event name, date and time on the top so the qr code can be easily identified. on rotating qr codes the rotation interval can be chosen. for that implement a slider that goes from 3 seonds to 5 minutes. then there are three collision detection modes block collisions, mark collisions, ignore collisions. when blocking collisions the user can not open the form a second time with the same client id if they already have filled it out. if mark collisons is selected, the user can submit the form normally but the record is flagged as collision. on the attendance list when clicking on a collision row, show a pop-up window with all the other records it collides with. then allow individually delete some of them, delete all, or mark all of them as cleared -> not collision anymore but checked-in. if collision setting is set on ignore, just allow check ins and do not mark them differently. (default ignore)

then there is also the setting for email receipts. when this setting is turned on (default off) users that fill out attendance or excuse forms get a receipt send to their email that they have checked in or that they have been marked as excused. make e-mail field non removable.

create a privacy policy page that is legally working in Germany and display a short privacy notice below every public form submission button throughout the app. in every public form use the brand logo of the workspace if not disabled in settings of the event.

## RSVP objects

The rsvp page displays a database view like on event attendance. same featues, same view. the user can create rsvp forms with custom fields in their own chosen order with name, description and value type. then they can share links multiple customized links with the form. they can track, how many times the form was opened per link, and filled out per link. links can be individually delteted or activated/deactivated. so there is "Form" (editing the form texts and fields and customizing it), "Links" (creating links and seeing statistics to every link), "Submissions" (all the submitted records in a database with export functions and seeing individual responses in a detailed view)

## Series objects

A Series can be used to analyse attendance behaviour over a series of events. events can be added to the series or to multiple series at once and the series analyses a graph view of attendance and excuses over time, and shows a list of all attendees in that series. show how many times they where present, how many times they were excused and how many times they were not present without excuse. events can have individual weight in that series. one can also see in detail to which events the attendee attended and can export everything as csv list or as csv matrix. there are series settings in settings the user chooses a field with which the attendee records are grouped. default is email because it is the most reliable and stays the same. and there is also a tab in the sidebar for sanitize collisions. when sanitizing collisions the objective is to fix issues when people had typos in their name or email etc. collisions are always detected on the grouping field of the series and stored non destructively in the extra table without altering the original records. collisions are detected via distance matrix or client id matching and merged so they are the same person in the data analysis. records can also manually be merged.
# Design

The design is professional, precise. Take Inspiration from Notion and still beautiful. light, black, white gray, a littel warm colors. Think of components that are reused a lot. such as 
- database like list views. databases work in diffferent screen sizes, are well contrasted and precise. their columns are always well aligned. they are sortable by every column, they have a bulk selection box on the left. each entire row is clickable. sometimes they have quick action buttons on the very right side such as delete, duplicate, or something else that fits to this specific use. 
- confirmation pop ups. they are modern, on the center of the screen and are used when deleting something, or logging out or similar things
- buttons, highlighted buttons

Every database has a search bar and filter options and everywhere where a database is there has to be somehow an add button to create more entries to that database. Every Database has filter options for every attribute. if the attribute is a date, a timespan can be set for filter. if it is a bool, a state can be selected. if it is a number, a range can be set. filters can be combined

First build the app for desktop browser views. then, after you are finished, make everything well designed and compatible with mobile views. mobile friendly. make it also work on very small screens like many current phones are.

Use the svg icon that i provided as the app icon. make this app also pwa able for mobile devices and use the same icon as favicon.

# Landing Page, Imprint, Privacy and Support

create a landing page for the entire app that stays precise and professional. the app target group are people who want to track attendance on events and value accountablilty and reliablity and privacy. make it business like, notion like in the existing corporate design. take inspiration from autors, editorial, writing.

create an imprint page and a privacy page where the forms are linked to. create a button for supporting the app with a link to a stripe donation page.

# Email service and env

I want to use my own smtp server for all emails. make this configureable using environment variables. supabase is connected via environment variables too.

# GDPR compliance

I want to make this compliant with gdpr laws and want to be able to advertize it as such.