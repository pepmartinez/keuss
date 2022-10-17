"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[126],{3905:(e,t,n)=>{n.d(t,{Zo:()=>p,kt:()=>d});var o=n(7294);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);t&&(o=o.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,o)}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,o,r=function(e,t){if(null==e)return{};var n,o,r={},a=Object.keys(e);for(o=0;o<a.length;o++)n=a[o],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(o=0;o<a.length;o++)n=a[o],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var l=o.createContext({}),u=function(e){var t=o.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):s(s({},t),e)),n},p=function(e){var t=u(e.components);return o.createElement(l.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return o.createElement(o.Fragment,{},t)}},c=o.forwardRef((function(e,t){var n=e.components,r=e.mdxType,a=e.originalType,l=e.parentName,p=i(e,["components","mdxType","originalType","parentName"]),c=u(n),d=r,g=c["".concat(l,".").concat(d)]||c[d]||m[d]||a;return n?o.createElement(g,s(s({ref:t},p),{},{components:n})):o.createElement(g,s({ref:t},p))}));function d(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var a=n.length,s=new Array(a);s[0]=c;var i={};for(var l in t)hasOwnProperty.call(t,l)&&(i[l]=t[l]);i.originalType=e,i.mdxType="string"==typeof e?e:r,s[1]=i;for(var u=2;u<a;u++)s[u]=n[u];return o.createElement.apply(null,s)}return o.createElement.apply(null,n)}c.displayName="MDXCreateElement"},7433:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>s,default:()=>m,frontMatter:()=>a,metadata:()=>i,toc:()=>u});var o=n(7462),r=(n(7294),n(3905));const a={id:"stream-mongo",title:"Stream-mongo backend",sidebar_label:"Stream-mongo backend"},s=void 0,i={unversionedId:"usage/streaming/stream-mongo",id:"usage/streaming/stream-mongo",title:"Stream-mongo backend",description:"stream-mongo is the result of a series of experiments to find out if implementing event streaming on top of mongodb with a",source:"@site/docs/04-usage/07-streaming/01-stream-mongo.md",sourceDirName:"04-usage/07-streaming",slug:"/usage/streaming/stream-mongo",permalink:"/keuss/docs/usage/streaming/stream-mongo",draft:!1,editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/04-usage/07-streaming/01-stream-mongo.md",tags:[],version:"current",sidebarPosition:1,frontMatter:{id:"stream-mongo",title:"Stream-mongo backend",sidebar_label:"Stream-mongo backend"},sidebar:"tutorialSidebar",previous:{title:"Examples",permalink:"/keuss/docs/usage/pipelines/examples"},next:{title:"Examples",permalink:"/keuss/docs/examples"}},l={},u=[{value:"Creation options",id:"creation-options",level:2},{value:"Usage",id:"usage",level:2},{value:"Extra stats",id:"extra-stats",level:2},{value:"Limitations",id:"limitations",level:2}],p={toc:u};function m(e){let{components:t,...n}=e;return(0,r.kt)("wrapper",(0,o.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"stream-mongo")," is the result of a series of experiments to find out if implementing event streaming on top of mongodb with a\nsimilar set of features that those offered by the likes of ",(0,r.kt)("inlineCode",{parentName:"p"},"kafka")," is, indeed, viable. "),(0,r.kt)("p",null,"One key feature is the concept of ",(0,r.kt)("inlineCode",{parentName:"p"},"consumer groups"),": in short, consumers can identify themselves as part of a group (a label)\nso it is guaranteed that each event/message will be consumed exactly by one consumer in each group. This is crucial for\ncorrect LB/HA and scalability without the need for complex logic or locks in the consumers"),(0,r.kt)("p",null,"There seems to be no such actual implementation out there, and the early tests on the obvious ways were all a dead end:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"using a capped collection is OK for a general pub/sub with some history/replay capabilities, but it seems impossible to\ncorrecty manage consumer groups"),(0,r.kt)("li",{parentName:"ul"},"using a regular collection also proved impossible to manage consumer groups in a general case: logic quickly turns\nexcessively complex and performance quickly degrades with a few groups"),(0,r.kt)("li",{parentName:"ul"},"using more than one collection (one for data, one for group management) can't be correctly done without race conditions")),(0,r.kt)("p",null,"A slightly different approach was tried: provide a small, predefined set of consumer groups. In most practical cases events\non each topic are in fact read by a (very) small set of consumer groups, and they do not change often either. So, this approximation\nmight be a good compromise "),(0,r.kt)("p",null,"The resulting implementation is just an extension of ",(0,r.kt)("inlineCode",{parentName:"p"},"ps-mongo"),", where elements consumed are not deleted but marked. Instead of a single 'consume marker', a set of them is added on each pushed element, where each marker represents a consumer group. The marker set and therefore the possible consumer groups of an element are defined by the Queue instance performing the push operation, and several Queues can push to the same queue using different sets. Performance is almost the same than that of ",(0,r.kt)("inlineCode",{parentName:"p"},"ps-mongo"),", with a slightly bigger index usage (each group has its own, separated index created)"),(0,r.kt)("p",null,"The 'consumer markers' also provide all the machinery to do reserve-commit-rollback, and also scheduling. Each consumer group will get its own separated logic and state for reserve-commit-rollback, and retries/scheduling"),(0,r.kt)("h2",{id:"creation-options"},"Creation options"),(0,r.kt)("p",null,"Creation of a Queue with backend ",(0,r.kt)("inlineCode",{parentName:"p"},"stream-mongo")," takes 2 specific options:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"ttl"),": time to keep consumed elements in the collection after being removed. Defauls to 3600 secs."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"groups"),": string, comma-separated list of possible consumer groups to be used on push operations. Defaults to ",(0,r.kt)("inlineCode",{parentName:"li"},"A,B,C")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"group"),": string, consumer group to be used on pop/reserve operations. Defaults to first element of ",(0,r.kt)("inlineCode",{parentName:"li"},"groups"))),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"ttl")," is shared with ",(0,r.kt)("inlineCode",{parentName:"p"},"ps-mongo")," backend and is used to create a TTL index to delete elements from the collection, so they don't get stored forever. Therefore, storage limitation is done by time, not by space or number of elements"),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"groups")," defines the possible consumer groups each subsequent inserted element would be addressed to (more on that later)"),(0,r.kt)("h2",{id:"usage"},"Usage"),(0,r.kt)("p",null,"In short, a ",(0,r.kt)("inlineCode",{parentName:"p"},"stream-mongo")," queue works by attaching a separated 'consumed marker' per each possible consumer group (defined at the queue option ",(0,r.kt)("inlineCode",{parentName:"p"},"groups"),") at push time, and later specifying the desired consumer group at pop/reserve time (defined at queue option ",(0,r.kt)("inlineCode",{parentName:"p"},"group"),"); a pop/reserve operation can only act on elements which have a 'consumer marker' for the group specified, and the set of groups of each element is defined by the options.groups of the Queue instance doing the push operation"),(0,r.kt)("p",null,"Let's see an example:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-js"},"\nconst async = require ('async');\nconst MQ =    require ('../../backends/stream-mongo');\n\n// initialize factory\nMQ ({url: 'mongodb://localhost/keuss_test_stream'}, (err, factory) => {\n  if (err) return console.error(err);\n\n  // producer: possible consumer groups are G1, G2 and G4, on top of collection test_stream\n  const q0 = factory.queue ('test_stream', {groups: 'G1, G2, G4'});\n\n  // first consumer, using consumer group G1\n  const q1 = factory.queue ('test_stream', {group: 'G1'});\n\n  // second consumer, using consumer group G2\n  const q2 = factory.queue ('test_stream', {group: 'G2'});\n\n  // let's roll\n  async.series ([\n    // push element\n    cb => q0.push ({a: 1}, cb),\n    cb => setTimeout (cb, 1000),  // wait a bit\n    cb => q1.pop ('consumer-1', cb), // pop element in group G1\n    cb => q2.pop ('consumer-2', cb), // pop element in group G2\n  ], (err, res) => {\n    console.log ('element popped for group G1:', res[2]);\n    console.log ('element popped for group G2:', res[3]);\n\n    factory.close ();\n  });\n});\n")),(0,r.kt)("p",null,"Both q1 and q2 will get the same element, inserted by q0. If we change the code a bit:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-js"},"const q0 = factory.queue ('test_stream', {groups: 'G1, G2, G4'});\nconst q1 = factory.queue ('test_stream', {group: 'G1'});\nconst q2 = factory.queue ('test_stream', {group: 'G2'});\nconst q2bis = factory.queue ('test_stream', {group: 'G2'});\nconst q3 = factory.queue ('test_stream', {group: 'G3'});\n\nasync.parallel ([\n    cb => setTimeout (() => q0.push ({a: 1}, cb), 1000), // delay push by a second so all consumers are ready\n    cb => q1.pop ('consumer-1', cb),\n    cb => q2.pop ('consumer-2', cb),\n    cb => q2bis.pop ('consumer-2', cb),\n    cb => q3.pop ('consumer-2', cb),\n  ], (err, res) => {\n    ...\n  })\n")),(0,r.kt)("p",null,"In this situation:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"q1 would get the message"),(0,r.kt)("li",{parentName:"ul"},"either q2 or q2bis (exactly one of them) would get a copy too; the other would block forever"),(0,r.kt)("li",{parentName:"ul"},"q3 would not get a message and woudl block forever")),(0,r.kt)("h2",{id:"extra-stats"},"Extra stats"),(0,r.kt)("p",null,"Queues of type ",(0,r.kt)("inlineCode",{parentName:"p"},"stream-mongo")," generate extra stats, besides the standard ones:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"stream.<group>.put"),": number of elements pushed, per consumer group (a single push will increment the counter for all\ngroups defined for the queue)"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"stream.<group>.get"),":  number of elements got, per consumer group"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"stream.<group>.reserve"),":  number of elements reserved, per consumer group"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"stream.<group>.commit"),":  number of elements committed, per consumer group"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"stream.<group>.rollback"),":  number of elements rolled back, per consumer group")),(0,r.kt)("h2",{id:"limitations"},"Limitations"),(0,r.kt)("p",null,"There are a few minor limitations & glitches in ",(0,r.kt)("inlineCode",{parentName:"p"},"stream-mongo"),", besides the obvious one about not being able to use an unlmited set of possible consumer groups:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"indexes: each possible consumer group in a queue carries the creation of a separated index on the mongodb collection,\nso be aware of the potential impact on space usage and performance "),(0,r.kt)("li",{parentName:"ul"},"default stats: default queue stats (put, get, reserve...) are no longer meaingful. They still get recorded, though"),(0,r.kt)("li",{parentName:"ul"},"no delete: as it happens in a full-fledged stream system, deleting an item has no meaning. therefore, it is not implemented"),(0,r.kt)("li",{parentName:"ul"},"arbirary defaults to groups and group: the fact that the default for groups is 'A,B,C' and the default for group is 'A' might\nseem arbitrary; it is just a set of values that make a default queue of ",(0,r.kt)("inlineCode",{parentName:"li"},"stream-mongo")," work as a replacement for ",(0,r.kt)("inlineCode",{parentName:"li"},"ps-mongo"),",\njust for coherency (except for the delete operation)")))}m.isMDXComponent=!0}}]);