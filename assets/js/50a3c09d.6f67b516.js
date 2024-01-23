"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[6474],{3905:(e,t,n)=>{n.d(t,{Zo:()=>m,kt:()=>c});var a=n(7294);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},o=Object.keys(e);for(a=0;a<o.length;a++)n=o[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(a=0;a<o.length;a++)n=o[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var s=a.createContext({}),p=function(e){var t=a.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},m=function(e){var t=p(e.components);return a.createElement(s.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},u=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,o=e.originalType,s=e.parentName,m=l(e,["components","mdxType","originalType","parentName"]),u=p(n),c=r,h=u["".concat(s,".").concat(c)]||u[c]||d[c]||o;return n?a.createElement(h,i(i({ref:t},m),{},{components:n})):a.createElement(h,i({ref:t},m))}));function c(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var o=n.length,i=new Array(o);i[0]=u;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:r,i[1]=l;for(var p=2;p<o;p++)i[p]=n[p];return a.createElement.apply(null,i)}return a.createElement.apply(null,n)}u.displayName="MDXCreateElement"},1205:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>s,contentTitle:()=>i,default:()=>d,frontMatter:()=>o,metadata:()=>l,toc:()=>p});var a=n(7462),r=(n(7294),n(3905));const o={title:"Modelling queues on MongoDB - II",author:"Pep Martinez",author_url:"https://github.com/pepmartinez",tags:["mongodb","tech"]},i=void 0,l={permalink:"/keuss/blog/2024/01/23/queues-on-mongo-part-2",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/blog/blog/2024-01-23-queues-on-mongo-part-2.md",source:"@site/blog/2024-01-23-queues-on-mongo-part-2.md",title:"Modelling queues on MongoDB - II",description:"This is a continuation of Modelling queues on MongoDB - I, where",date:"2024-01-23T00:00:00.000Z",formattedDate:"January 23, 2024",tags:[{label:"mongodb",permalink:"/keuss/blog/tags/mongodb"},{label:"tech",permalink:"/keuss/blog/tags/tech"}],readingTime:7.89,hasTruncateMarker:!1,authors:[{name:"Pep Martinez",url:"https://github.com/pepmartinez"}],frontMatter:{title:"Modelling queues on MongoDB - II",author:"Pep Martinez",author_url:"https://github.com/pepmartinez",tags:["mongodb","tech"]},prevItem:{title:"Modelling queues on MongoDB - I",permalink:"/keuss/blog/2024/01/23/queues-on-mongo-part-1"},nextItem:{title:"New website!",permalink:"/keuss/blog/2020/08/04/welcome"}},s={authorsImageUrls:[void 0]},p=[{value:"Adding delay/schedule",id:"adding-delayschedule",level:2},{value:"Adding reserve-commit-rollback",id:"adding-reserve-commit-rollback",level:2},{value:"Queues with historic data",id:"queues-with-historic-data",level:2},{value:"Queues fit for ETL pipelines: moving elements from one queue to the next, atomically",id:"queues-fit-for-etl-pipelines-moving-elements-from-one-queue-to-the-next-atomically",level:2}],m={toc:p};function d(e){let{components:t,...n}=e;return(0,r.kt)("wrapper",(0,a.Z)({},m,n,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("p",null,"This is a continuation of ",(0,r.kt)("a",{parentName:"p",href:"/blog/2024/01/23/queues-on-mongo-part-1"},"Modelling queues on MongoDB - I"),", where\nwe explained the technological basis on how to build a rather decent queue middleware by leveraging on preexisting\nDB technologies, and adding very little more"),(0,r.kt)("p",null,"Now, we explore how to push the technology further, building on top of what we got so far to add extra, useful\nfeatures"),(0,r.kt)("h2",{id:"adding-delayschedule"},"Adding delay/schedule"),(0,r.kt)("p",null,"This is a feature that is seldom found on QMWs, but that should be easy to implement if the\npersistence is sound: after all, if you got the items safely stored, they can remain stored for\nany arbitrary period of time"),(0,r.kt)("p",null,"The tricky part is to provide this feature while honoring these conditions:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"performance should not degrade. Both push and pop should remain ",(0,r.kt)("inlineCode",{parentName:"li"},"O(1)")),(0,r.kt)("li",{parentName:"ul"},"items awaiting should not block items that are ready")),(0,r.kt)("p",null,"On the other hand, this feature can be used to implement quite a lot of common logic, so it\n",(0,r.kt)("em",{parentName:"p"},"should")," be high in the wishlist. Some examples are:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"https://en.wikipedia.org/wiki/Exponential_backoff"},"exponential backoff")," if whatever you do\nwith an item goes wrong and you want to retry later"),(0,r.kt)("li",{parentName:"ul"},"simple scheduling of events or actions (",(0,r.kt)("em",{parentName:"li"},"items")," would model both)"),(0,r.kt)("li",{parentName:"ul"},"with some extra logic, it's easy to build a recurring or cron-like system, where items ",(0,r.kt)("em",{parentName:"li"},"happen"),"\nperiodically")),(0,r.kt)("p",null,"As it turns out, this is quite easy to model on MongoDB while still maintaining all the features\nand capabilities of the ",(0,r.kt)("em",{parentName:"p"},"good enough queues")," depicted before. The model can be expressed as:"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:"center"},"operation"),(0,r.kt)("th",{parentName:"tr",align:"center"},"implementation base"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"push"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.insertOne ({payload: params.item, when: params.when OR now()})"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"pop"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndDelete({when < now()}).payload"))))),(0,r.kt)("p",null,"One of the obvious changes is, we no longer insert the item as is: we encapsulate it inside an ",(0,r.kt)("em",{parentName:"p"},"envelope")," where we put extra information; in this case, a timestamp stating when the object should start being elligible for a ",(0,r.kt)("inlineCode",{parentName:"p"},"pop")," operation. Thus, the ",(0,r.kt)("inlineCode",{parentName:"p"},"pop")," will only affect items whose ",(0,r.kt)("inlineCode",{parentName:"p"},"when")," timestamp lies in the past, and ignore those with the timestamp still in the future"),(0,r.kt)("p",null,"Then, in order to keep the performance close to ",(0,r.kt)("inlineCode",{parentName:"p"},"O(1)")," we must be sure the collection has an index on ",(0,r.kt)("inlineCode",{parentName:"p"},"when"),"; moreover, it would be advisable to also order the ",(0,r.kt)("inlineCode",{parentName:"p"},"findOneAndDelete")," operation by ",(0,r.kt)("inlineCode",{parentName:"p"},"when"),", descending: this way we will add best-effort ordering, where elements with a longer-due timestamp are popped first"),(0,r.kt)("h2",{id:"adding-reserve-commit-rollback"},"Adding reserve-commit-rollback"),(0,r.kt)("p",null,"A feture that should be offered on every decent QMW is the\nability to reserve an item, then process it and commit it once\ndone, or rollback it if something fails and we want it to be\nretried later (or by other consumer)"),(0,r.kt)("p",null,"This allows for what's known as ",(0,r.kt)("em",{parentName:"p"},"at-least-once")," semmantics:\nevery item in the queue is guaranteed to be treated at least\nonce even in the event of consumer failure. IT ",(0,r.kt)("em",{parentName:"p"},"does not"),"\nguarantee lack of duplications, though. By contrast, the simple ",(0,r.kt)("em",{parentName:"p"},"pop")," model provides ",(0,r.kt)("em",{parentName:"p"},"at_most_once")," semantics: duplications are\nguaranteed to not to happen, but at the cost of risk of item\nloss if a consumer malfunctions"),(0,r.kt)("p",null,"Reserve-commit-rollback model cam be expressed as the following extension of the\n",(0,r.kt)("em",{parentName:"p"},"delay/schedule")," model above :"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:"center"},"operation"),(0,r.kt)("th",{parentName:"tr",align:"center"},"implementation base"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"push"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.insertOne ({payload: params.item, when: params.when OR now(), retries: 0, reserved: false})"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"pop"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndDelete({when < now()}).payload"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"reserve"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndUpdate({when < now()}, {when: (now() + params.timeout), reserved: true})"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"commit"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.delete({_id: params.reserved._id})"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"rollback"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndUpdate({_id: params.reserved._id}, {when: (now() + params.delay), reserved: false, retries: $inc})"))))),(0,r.kt)("p",null,"The general idea is to leverage the existing scheduling fature: to reserve an element is just to set its ",(0,r.kt)("inlineCode",{parentName:"p"},"when"),"\ntime ahead in the future, by a fixed ",(0,r.kt)("inlineCode",{parentName:"p"},"timeout")," amount; if the consumer is unable to process the element in this\ntime, the item will become elligible again for other consumers."),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"commit")," operation simply deletes the entry by using the ",(0,r.kt)("inlineCode",{parentName:"p"},"_id")," of the element returned by\n",(0,r.kt)("inlineCode",{parentName:"p"},"reserve"),"; and the ",(0,r.kt)("inlineCode",{parentName:"p"},"rollback")," is a bit more complex: it modifies it to remove the ",(0,r.kt)("inlineCode",{parentName:"p"},"reserved")," flag, increments\nthe ",(0,r.kt)("inlineCode",{parentName:"p"},"retries")," counter and -most important- sets a ",(0,r.kt)("inlineCode",{parentName:"p"},"when")," time further in the future. This last bit fulfills\nthe mprotant feature of adding delays to retries, so an element rejected by a consumer for further retry\nwill not be available immediately (when it is likely to fail again)"),(0,r.kt)("p",null,"Note that the ",(0,r.kt)("inlineCode",{parentName:"p"},"reserved")," flag is purely informational, although further checks could be done on it to improve\nrobustness. The same goes for ",(0,r.kt)("inlineCode",{parentName:"p"},"retries"),": it just counts the number of retries; more logic could be added to this,\nfor example adding a ",(0,r.kt)("em",{parentName:"p"},"dead-queue")," feature: if the number of retries goes too high the items are moved to a\nseparated queue for a more dedicated processing at a later time"),(0,r.kt)("h2",{id:"queues-with-historic-data"},"Queues with historic data"),(0,r.kt)("p",null,"Here's another twist: instead of fully removing items once consumed (by means f ",(0,r.kt)("inlineCode",{parentName:"p"},"pop")," or ",(0,r.kt)("inlineCode",{parentName:"p"},"commit"),"), we just mark\nthem as deleted; then we keep them around for som etime, just in case we need to inspect past traffic, or replay\nsome items. This feature can be desirable on environments where the ability to inspect or even reproduce past traffic\nis paramount. Also, this can be easily done at the expense of storage space only, with the following variation over\nthe model above:"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:"center"},"operation"),(0,r.kt)("th",{parentName:"tr",align:"center"},"implementation base"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"push"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.insertOne ({payload: params.item, when: params.when OR now(), retries: 0, reserved: false})"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"pop"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndUpdate({when < now(), processed: $nonexistent}, {processed: now(), when: $INF}).payload"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"reserve"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndUpdate({when < now(), processed: $nonexistent}, {when: (now() + params.timeout), reserved: true})"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"commit"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.update({_id: params.reserved._id}, {processed: now(), when: $INF})"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"rollback"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndUpdate({_id: params.reserved._id}, {when: (now() + params.delay), reserved: false, retries: $inc})"))))),(0,r.kt)("p",null,"Then, we need to add a ",(0,r.kt)("a",{parentName:"p",href:"https://www.mongodb.com/docs/manual/core/index-ttl/"},"TTL index")," on the new field ",(0,r.kt)("inlineCode",{parentName:"p"},"processed"),", with\nsome long-enough expiration time"),(0,r.kt)("p",null,"The main difference is the addition of a ",(0,r.kt)("inlineCode",{parentName:"p"},"processed")," field that marks both whether the item was processed (that is ",(0,r.kt)("em",{parentName:"p"},"deleted"),",\n",(0,r.kt)("em",{parentName:"p"},"no more"),", ",(0,r.kt)("em",{parentName:"p"},"gone to meet its maker"),") and if so, when that happened. This field is also used to delete old entries, once some\nfixed time has elapsed. This means those queues can potentially grow very big, cause the condition to remove old entries is\nage, and not size"),(0,r.kt)("p",null,"Note that, in order to improve performance a bit, when an element is processed (after either ",(0,r.kt)("em",{parentName:"p"},"pop")," or ",(0,r.kt)("em",{parentName:"p"},"commit"),") its ",(0,r.kt)("em",{parentName:"p"},"when")," is\nset to some time far in the future, to move it 'away' of the ",(0,r.kt)("em",{parentName:"p"},"get"),"/",(0,r.kt)("em",{parentName:"p"},"reserve")," query"),(0,r.kt)("h2",{id:"queues-fit-for-etl-pipelines-moving-elements-from-one-queue-to-the-next-atomically"},"Queues fit for ETL pipelines: moving elements from one queue to the next, atomically"),(0,r.kt)("p",null,"Htis is an interesting concept: one of the common uses of job queues is to build what's known as ELT pipelines: a set of\ncomputing stations where items are transformed or otherwise processed, connected with queues. A common example would be\na POSIX shell pipeline, where several commands are tied together so the output of one becomes the input of the next; a\nETL pipeline can have also forks and loops, so the topology can be generalized to a graph, not just a linear pipeline"),(0,r.kt)("p",null,"Let us assume for a moment that messages are never created or duplicated in any station: in other words, an item entering\na station will produce zero or one items as output. In this scenario, oen of the reliability problems that arise is that,\nusually, moving items from one (input) queue to the next (output) queue is not an atomic operation. This may lead to either item loss or item duplication in the case of station\nmalfunction, even if we use ",(0,r.kt)("inlineCode",{parentName:"p"},"reserve-commit")),(0,r.kt)("p",null,"If we push to output after committing on input, we incur on risk of loss:"),(0,r.kt)("mermaid",{value:"sequenceDiagram\n  autonumber\n  participant input-queue\n  participant station\n  participant output-queue\n  station->>+input-queue: reserve\n  input-queue->>-station: element\n  activate station\n  note right of station: process element\n  station->>-input-queue: commit\n  activate input-queue\n  input-queue->>station: ack\n  deactivate input-queue\n  note left of input-queue: element is no longer in queue\n  note right of station: potential to item loss here\n  station->>+output-queue: push"}),(0,r.kt)("p",null,"whereas if we push to output ",(0,r.kt)("em",{parentName:"p"},"before")," commit on input, we risk duplication:"),(0,r.kt)("mermaid",{value:"sequenceDiagram\n  autonumber\n  participant input-queue\n  participant station\n  participant output-queue\n  station->>+input-queue: reserve\n  input-queue->>-station: element\n  activate station\n  note right of station: process element\n  note left of input-queue: element is still in queue\n  station->>+output-queue: push\n  note right of station: potential to item duplication here\n  station->>-input-queue: commit\n  activate input-queue\n  input-queue->>station: ack\n  deactivate input-queue\n  station->>+output-queue: push"}),(0,r.kt)("p",null,"So, the ",(0,r.kt)("em",{parentName:"p"},"commit-in-input")," and ",(0,r.kt)("em",{parentName:"p"},"push-on-output")," operations must be done atomically; and it turns out it is quite simple\nto extend the model to accomodate that as a new, atomic ",(0,r.kt)("em",{parentName:"p"},"move-to-queue")," operation (although it comes at a price, as we\nwill see)"),(0,r.kt)("p",null,"This new operation requires that ",(0,r.kt)("em",{parentName:"p"},"all")," queues of a given pipeline have to be hosted in the same mongodb collection; so,\nour item envelope grows to contain an extra field, ",(0,r.kt)("inlineCode",{parentName:"p"},"q"),". Then, all operations are augmented to use this new field:"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:"center"},"operation"),(0,r.kt)("th",{parentName:"tr",align:"center"},"implementation base"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"push"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.insertOne ({q: params.qname, payload: params.item, when: params.when OR now(), retries: 0, reserved: false})"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"pop"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndDelete({q: params.qname, when < now()}).payload"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"reserve"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndUpdate({q: params.qname, when < now()}, {when: (now() + params.timeout), reserved: true})"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"commit"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.delete({_id: params.reserved._id})"))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"rollback"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndUpdate({_id: params.reserved._id}, {when: (now() + params.delay), reserved: false, retries: $inc})"))))),(0,r.kt)("p",null,"The new operation ",(0,r.kt)("em",{parentName:"p"},"move-to-queue")," is expected to act upon a reserved item, and can be modelled as:"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:"center"},"operation"),(0,r.kt)("th",{parentName:"tr",align:"center"},"implementation base"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:"center"},"moveToQ"),(0,r.kt)("td",{parentName:"tr",align:"center"},(0,r.kt)("inlineCode",{parentName:"td"},"coll.findOneAndUpdate({_id: params.reserved._id}, {q: params.new_qname, reserved: false, retries: 0})"))))),(0,r.kt)("p",null,"The operation is rather similar to a rollback, and it is definitely atomic"))}d.isMDXComponent=!0}}]);