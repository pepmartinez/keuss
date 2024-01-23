"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[3558],{3905:(e,t,a)=>{a.d(t,{Zo:()=>p,kt:()=>c});var n=a(7294);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function i(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function l(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?i(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):i(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function o(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},i=Object.keys(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var s=n.createContext({}),m=function(e){var t=n.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):l(l({},t),e)),a},p=function(e){var t=m(e.components);return n.createElement(s.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},u=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,i=e.originalType,s=e.parentName,p=o(e,["components","mdxType","originalType","parentName"]),u=m(a),c=r,k=u["".concat(s,".").concat(c)]||u[c]||d[c]||i;return a?n.createElement(k,l(l({ref:t},p),{},{components:a})):n.createElement(k,l({ref:t},p))}));function c(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=a.length,l=new Array(i);l[0]=u;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o.mdxType="string"==typeof e?e:r,l[1]=o;for(var m=2;m<i;m++)l[m]=a[m];return n.createElement.apply(null,l)}return n.createElement.apply(null,a)}u.displayName="MDXCreateElement"},8398:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>s,contentTitle:()=>l,default:()=>d,frontMatter:()=>i,metadata:()=>o,toc:()=>m});var n=a(7462),r=(a(7294),a(3905));const i={id:"concepts",title:"Concepts",sidebar_label:"Concepts"},l=void 0,o={unversionedId:"concepts",id:"concepts",title:"Concepts",description:"Queue",source:"@site/docs/03-concepts.md",sourceDirName:".",slug:"/concepts",permalink:"/keuss/docs/concepts",draft:!1,editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/03-concepts.md",tags:[],version:"current",sidebarPosition:3,frontMatter:{id:"concepts",title:"Concepts",sidebar_label:"Concepts"},sidebar:"tutorialSidebar",previous:{title:"Quickstart",permalink:"/keuss/docs/quickstart"},next:{title:"Putting all together",permalink:"/keuss/docs/Usage/putting-all-together"}},s={},m=[{value:"Queue",id:"queue",level:2},{value:"Bucket",id:"bucket",level:2},{value:"Pipeline",id:"pipeline",level:2},{value:"Processor",id:"processor",level:2},{value:"Storage",id:"storage",level:2},{value:"Signaller",id:"signaller",level:2},{value:"Stats",id:"stats",level:2},{value:"How all fits together",id:"how-all-fits-together",level:2}],p={toc:m};function d(e){let{components:t,...a}=e;return(0,r.kt)("wrapper",(0,n.Z)({},p,a,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h2",{id:"queue"},"Queue"),(0,r.kt)("p",null,"A ",(0,r.kt)("strong",{parentName:"p"},"Queue")," is more of an interface, a definition of what it can do. Keuss queues are capable of:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"Insert one element."),(0,r.kt)("li",{parentName:"ul"},"Schedule an element: insert one element with a not-before datetime; this means, the element will be affectively inserted in the queue, but any operation on the queue ofter that will not take that element into account before the not-before datetime."),(0,r.kt)("li",{parentName:"ul"},"Get an element, and block for some specified time if no element is available."),(0,r.kt)("li",{parentName:"ul"},"Reserve an element, and block for some specified time if no element is available."),(0,r.kt)("li",{parentName:"ul"},"Commit (remove) or rollback (return back) a previously reserved element."),(0,r.kt)("li",{parentName:"ul"},"Remove an element by its id (which was returned in the insertion)"),(0,r.kt)("li",{parentName:"ul"},"Get element count (it will not include the elements scheduled in the future)."),(0,r.kt)("li",{parentName:"ul"},"Get element count whose not-before datetime is in the future (scheduled elements)."),(0,r.kt)("li",{parentName:"ul"},"Get usage stats: elements inserted, elements extracted.")),(0,r.kt)("p",null,(0,r.kt)("em",{parentName:"p"},"Element")," here translates to any js object, js array, string, number or ",(0,r.kt)("inlineCode",{parentName:"p"},"Buffer"),". Optionally, a set of headers (in the form of a js object with string, number or boolean values) can be added."),(0,r.kt)("h2",{id:"bucket"},"Bucket"),(0,r.kt)("p",null,"The initial idea for Keuss Queues, transtated the elements inserted in the queue into rows of the backed storage. This makes it easy to inspect the elements values directly in the backend, which is pretty useful when you need to debug things up. Buckets came later, as a way to pack more than one message into a single row of the backend to gain performance. See ",(0,r.kt)("a",{parentName:"p",href:"usage/buckets"},"Bucked-based backends"),"."),(0,r.kt)("h2",{id:"pipeline"},"Pipeline"),(0,r.kt)("p",null,"A ",(0,r.kt)("strong",{parentName:"p"},(0,r.kt)("a",{parentName:"strong",href:"usage/pipelines/about"},"pipeline"))," is an enhanced queue that provides an extra operation: pass an element to another queue ",(0,r.kt)("strong",{parentName:"p"},"atomically"),". In an scenario where processors are linked with queues, it is usually a good feature to allow the ",(0,r.kt)("em",{parentName:"p"},"'commit element in incoming queue, insert element in the next queue'")," to be atomic. This removes chances for race conditions, or message losses."),(0,r.kt)("p",null,"The pipeline concept is, indeed, an extension of the reserve-commit model; it is so far implemented only atop mongodb, and it is anyway considered as a 'low-level' feature, best used by means of specialized classes to encapsulate the aforementioned processors."),(0,r.kt)("h2",{id:"processor"},"Processor"),(0,r.kt)("p",null,"A ",(0,r.kt)("strong",{parentName:"p"},"processor")," is an object tied to one or more queues, that controls the flow of messages between them. They are used mainly to define ",(0,r.kt)("a",{parentName:"p",href:"usage/pipelines/about"},(0,r.kt)("strong",{parentName:"a"},"pipelines")),". Currently there are 4 specialized classes of processors defined:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"usage/pipelines/processors#baselink"},"BaseLink"),": This is really more of a base definition for the rest of the specialized processors."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"usage/pipelines/processors#directlink"},"DirectLink")," (one queue to another)."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"usage/pipelines/processors#choicelink"},"ChoiceLink")," (one queue to one or more queues)."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"usage/pipelines/processors#sink"},"Sink")," (endpoint, one queue to none).")),(0,r.kt)("h2",{id:"storage"},"Storage"),(0,r.kt)("p",null,"The ",(0,r.kt)("strong",{parentName:"p"},"Storage")," or ",(0,r.kt)("strong",{parentName:"p"},"Backend")," provides almost-complete queue primitives, fully functional and already usable as is. Keuss comes with 7 backends, with various levels of features and performance:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"mongo")),", a mongodb-based backend that provides the full set of queue features, still with decent performance."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"redis-oq")),", backed using an ordered queue on top of redis (made in turn with a sorted set, a hash and some lua). Provides all queue features including reserve-commit-rollback. Noticeable faster than mongodb."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"redis-list")),", backed using a redis list. Does not offer reserve-commit-rollback nor the ability to schedule, but is much faster than redis-oq"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"pl-mongo")),", a version of the ",(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"mongo"))," backend that provides pipelining capabilities (the queues it produces are also pipelines)."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"ps-mongo")),", a version of the ",(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"mongo"))," backend where elements are not physically deleted from the collection when extracted; instead, they are just marked as processed and later deleted automatically using a mongodb TTL index."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"bucket-mongo-safe")),", an approach to storing more than one element on each mongodb record in order to break past mongodb I/O limitations, provides both scheduling and reserve support with staggering performance on a reasonable durability."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"stream-mongo")),", a simple yet effective approximation to event streaming by adding more than one possible consumer to each\nelement in queue. This provides a good approximation to a real event streamer such as ",(0,r.kt)("inlineCode",{parentName:"li"},"kafka")," or ",(0,r.kt)("inlineCode",{parentName:"li"},"nats-jetstream"),", at a\nfraction fo the complexity")),(0,r.kt)("p",null,"As mentioned before, persistence and High Availability (HA) depends exclusively on the underliying system: mongodb provides production-grade HA and persistence while using potentially gigantic queues, and with redis one can balance performance and simplicity over reliability and durability, by using standalone redis, redis sentinel or redis cluster. Keuss uses ",(0,r.kt)("a",{parentName:"p",href:"https://github.com/luin/ioredis"},"ioredis")," as redis driver, which supports all 3 cases."),(0,r.kt)("p",null,"The following table shows the capabilities of each backend:"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"backend"),(0,r.kt)("th",{parentName:"tr",align:"center"},"delay/schedule"),(0,r.kt)("th",{parentName:"tr",align:"center"},"reserve/commit"),(0,r.kt)("th",{parentName:"tr",align:"center"},"pipelining"),(0,r.kt)("th",{parentName:"tr",align:"center"},"history"),(0,r.kt)("th",{parentName:"tr",align:"center"},"remove"),(0,r.kt)("th",{parentName:"tr",align:"center"},"streaming"),(0,r.kt)("th",{parentName:"tr",align:"center"},"throughput"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"redis-list"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"++++")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"redis-oq"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"+++")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"mongo"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"++")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"pl-mongo"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"+")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"ps-mongo"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"++")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"bucket-mongo-safe"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"+++++")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"stream-mongo"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"-"),(0,r.kt)("td",{parentName:"tr",align:"center"},"x"),(0,r.kt)("td",{parentName:"tr",align:"center"},"++")))),(0,r.kt)("h2",{id:"signaller"},"Signaller"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Signaller")," provides a bus interconnecting all keuss clients, so events can be shared. Keuss provides 3 signallers:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"local"))," : provides in-proccess messaging, useful only for simple cases or testing"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"redis-pubsub")),": uses the pubsub subsystem provided by redis"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"mongo-capped")),": uses pubsub on top of a mongodb capped collection, using ",(0,r.kt)("a",{parentName:"li",href:"https://www.npmjs.com/package/@nodebb/mubsub"},"@nodebb/mubsub"))),(0,r.kt)("p",null,"So far, the only events published by keuss are:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},"element inserted in queue X"),", which allows other clients waiting for elements to be available to wake up and retry. A client will not fire an event if\nanother one of the same type (same client, same queue) was already fired less than 50ms ago."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},"queue X paused/resumed"),".")),(0,r.kt)("p",null,"The use of a signaller provider different from ",(0,r.kt)("inlineCode",{parentName:"p"},"local")," allows the formation of a cluster of clients: all those clients sharing the same signaller object\n(with the same configuration, obviously) will see and share the same set of events and therefore can collaborate (for example, all consumers of a given\nqueue ",(0,r.kt)("em",{parentName:"p"},"on every machine")," will be awaken when an insertion happens ",(0,r.kt)("em",{parentName:"p"},"on any machine"),")"),(0,r.kt)("h2",{id:"stats"},"Stats"),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Stats")," provides counters and metrics on queues, shared among keuss clients. The supported stats are:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"Elements put"),(0,r.kt)("li",{parentName:"ul"},"Elements got"),(0,r.kt)("li",{parentName:"ul"},"Elements reserved"),(0,r.kt)("li",{parentName:"ul"},"Elements committed"),(0,r.kt)("li",{parentName:"ul"},"Elements rolled back"),(0,r.kt)("li",{parentName:"ul"},"Paused status")),(0,r.kt)("p",null,"Three options are provided to store the stats:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"mem")),": very simple in-process, memory based."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"redis")),": backed by redis hashes. Modifications are buffered in memory and flushed every 100ms."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"mongo")),": backed by mongodb using one object per queue inside a single collection. Modifications are buffered in memory and flushed every 100ms.")),(0,r.kt)("p",null,"The use of a stats provider different from ",(0,r.kt)("inlineCode",{parentName:"p"},"mem")," allows for a shared view of a cluster of clients: all those clients sharing the same stats object\n(with the same configuration, obviously) will see a coherent, aggregated view of the stats (all clients will update the stats)"),(0,r.kt)("p",null,"The stats can also be used as a queue discovery source: existing queues can be recreated from the information stored (in fact, extra information\nneeded to ensure this is also stored alongside the actual stats). Keuss does not, at this point, provide any actual ",(0,r.kt)("em",{parentName:"p"},"recreate")," functionality on\ntop of this"),(0,r.kt)("h2",{id:"how-all-fits-together"},"How all fits together"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"Queues")),", or rather clients to individual queues, are created using a ",(0,r.kt)("em",{parentName:"li"},"backend")," as factory."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"Backends"))," need to be initialized before being used. Exact initialization details depend on each backend."),(0,r.kt)("li",{parentName:"ul"},"When creating a ",(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"queue")),", a ",(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"signaller"))," and a ",(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"stats"))," are assigned to it. The actual class/type to be used can be specified at the queue's creation moment, or at the backend initialization moment. By default ",(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"local"))," and ",(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"mem")),", respectively, are used for redis-based backends; for mongodb-based backends, ",(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"mongo-capped"))," and ",(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"mongo"))," are used intead as defaults"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"Queues"))," are created on-demand, and are never destroyed as far as Keuss is concerned. They do exist as long as the underlying backend kepts them in existence: for example, redis queues dissapear as such when they become empty."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},(0,r.kt)("inlineCode",{parentName:"em"},"Pipelines"))," are, strictly speaking, just enhanced queues; as such they behave and can be used as a queue. More info on pipelines ",(0,r.kt)("a",{parentName:"li",href:"usage/pipelines/about"},"here"))))}d.isMDXComponent=!0}}]);