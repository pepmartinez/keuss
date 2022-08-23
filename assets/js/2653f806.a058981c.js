"use strict";(self.webpackChunkmy_website=self.webpackChunkmy_website||[]).push([[958],{3905:(e,t,a)=>{a.d(t,{Zo:()=>p,kt:()=>c});var n=a(7294);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function i(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function l(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?i(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):i(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function o(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},i=Object.keys(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var s=n.createContext({}),u=function(e){var t=n.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):l(l({},t),e)),a},p=function(e){var t=u(e.components);return n.createElement(s.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},m=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,i=e.originalType,s=e.parentName,p=o(e,["components","mdxType","originalType","parentName"]),m=u(a),c=r,k=m["".concat(s,".").concat(c)]||m[c]||d[c]||i;return a?n.createElement(k,l(l({ref:t},p),{},{components:a})):n.createElement(k,l({ref:t},p))}));function c(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=a.length,l=new Array(i);l[0]=m;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o.mdxType="string"==typeof e?e:r,l[1]=o;for(var u=2;u<i;u++)l[u]=a[u];return n.createElement.apply(null,l)}return n.createElement.apply(null,a)}m.displayName="MDXCreateElement"},994:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>s,contentTitle:()=>l,default:()=>d,frontMatter:()=>i,metadata:()=>o,toc:()=>u});var n=a(7462),r=(a(7294),a(3905));const i={id:"factory",title:"Factory API",sidebar_label:"Factory"},l=void 0,o={unversionedId:"API/factory",id:"API/factory",title:"Factory API",description:"Backends, which work as queue factories, have the following operations:",source:"@site/docs/06-API/factory.md",sourceDirName:"06-API",slug:"/API/factory",permalink:"/keuss/docs/API/factory",draft:!1,editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/06-API/factory.md",tags:[],version:"current",frontMatter:{id:"factory",title:"Factory API",sidebar_label:"Factory"},sidebar:"tutorialSidebar",previous:{title:"Examples",permalink:"/keuss/docs/examples"},next:{title:"Queue",permalink:"/keuss/docs/API/queue"}},s={},u=[{value:"<code>MQ</code>: Factory initialization",id:"mq-factory-initialization",level:2},{value:"MongoDB defaults",id:"mongodb-defaults",level:3},{value:"Dead Letter",id:"dead-letter",level:3},{value:"<code>queue</code>: Queue creation",id:"queue-queue-creation",level:2},{value:"<code>close</code>: Factory close",id:"close-factory-close",level:2}],p={toc:u};function d(e){let{components:t,...a}=e;return(0,r.kt)("wrapper",(0,n.Z)({},p,a,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("p",null,"Backends, which work as queue factories, have the following operations:"),(0,r.kt)("h2",{id:"mq-factory-initialization"},(0,r.kt)("inlineCode",{parentName:"h2"},"MQ"),": Factory initialization"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"var QM = require ('keuss/backends/<backend>');\n\nMQ (opts, (err, factory) => {\n  // factory contains the actual factory, initialized\n})\n")),(0,r.kt)("p",null,"where ",(0,r.kt)("inlineCode",{parentName:"p"},"opts")," is an object containing initialization options. Common properties to all backends are:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"name"),": Name for the factory, defaults to 'N'."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"reserve_delay"),": number of seconds to keep 'reserved' status after a reserve operation. Defaults to 120."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"stats"),":",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"provider"),": stats backend to use, as result of ",(0,r.kt)("inlineCode",{parentName:"li"},"require ('keuss/stats/<provider>')"),". Defaults to ",(0,r.kt)("inlineCode",{parentName:"li"},"require ('keuss/stats/mem')"),"."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"opts"),": options for the provider."))),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"signaller"),":",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"provider"),": signaller provider to use, as result of ",(0,r.kt)("inlineCode",{parentName:"li"},"require ('keuss/signal/<provider>')"),". Defaults to ",(0,r.kt)("inlineCode",{parentName:"li"},"require ('keuss/signal/local')"),"."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"opts"),": options for the provider."))),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"deadletter"),": deadletter options, described below.",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"max_ko"),": max rollbacks per element."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"queue"),": deadletter queue name.")))),(0,r.kt)("p",null,"The following are backend-dependent values:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"backends ",(0,r.kt)("em",{parentName:"li"},"mongo"),", ",(0,r.kt)("em",{parentName:"li"},"pl-mongo")," and ",(0,r.kt)("em",{parentName:"li"},"ps-mongo"),".",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"url"),": mongodb url to use, defaults to ",(0,r.kt)("inlineCode",{parentName:"li"},"mongodb://localhost:27017/keuss"),"."))),(0,r.kt)("li",{parentName:"ul"},"backends ",(0,r.kt)("em",{parentName:"li"},"redis-list")," and ",(0,r.kt)("em",{parentName:"li"},"redis-oq"),".",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"redis"),": data to create a redis connection to the Redis acting as backend, see below."))),(0,r.kt)("li",{parentName:"ul"},"backend ",(0,r.kt)("em",{parentName:"li"},"ps-mongo"),".",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"ttl"),": time to keep consumed elements in the collection after being removed. Defauls to 3600 secs.")))),(0,r.kt)("h3",{id:"mongodb-defaults"},"MongoDB defaults"),(0,r.kt)("p",null,"On MongoDB-based backends, ",(0,r.kt)("inlineCode",{parentName:"p"},"signaller")," and ",(0,r.kt)("inlineCode",{parentName:"p"},"stats")," defaults to:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"signaller"),": uses ",(0,r.kt)("inlineCode",{parentName:"li"},"mongo-capped"),", using the same mongodb url than the backend, but postfixing the db with ",(0,r.kt)("inlineCode",{parentName:"li"},"_signal"),"."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"stats"),": uses ",(0,r.kt)("inlineCode",{parentName:"li"},"mongo-capped"),", using the same mongodb url than the backend, but postfixing the db with ",(0,r.kt)("inlineCode",{parentName:"li"},"_stats"),".\nThis alows cleaner and more concise initialization, using a sane default.")),(0,r.kt)("h3",{id:"dead-letter"},"Dead Letter"),(0,r.kt)("p",null,"The concept of ",(0,r.kt)("em",{parentName:"p"},"deadletter")," is very common on queue middlewares: in case reserve/commit/rollback is used to consume, a maximum number of fails (reserve-rollback) can be set on each element; if an element sees more rollbacks than allowed, the element is moved to an special queue (dead letter queue) for later, offline inspection."),(0,r.kt)("p",null,"By default, keuss uses no deadletter queue; it can be activated by passing a ",(0,r.kt)("inlineCode",{parentName:"p"},"deadletter")," object at the time of factory creation, in the options:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"var factory_opts = {\n  url: 'mongodb://localhost/qeus',\n  deadletter: {\n    max_ko: 3\n  }\n};\n\n// initialize factory\nMQ(factory_opts, (err, factory) => {\n  ...\n")),(0,r.kt)("p",null,"This object must not be empty, and can contain the following keys:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"max_ko"),": maximum number of rollbacks per element allowed. The next rollback will cause the element to be moved to the deadletter queue. Defaults to 0, which means ",(0,r.kt)("inlineCode",{parentName:"li"},"infinite"),"."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"queue"),": queue name of the deadletter queue, defaults to ",(0,r.kt)("inlineCode",{parentName:"li"},"__deadletter__"),".")),(0,r.kt)("admonition",{type:"tip"},(0,r.kt)("p",{parentName:"admonition"},"All storage backends support deadletter. In ",(0,r.kt)("inlineCode",{parentName:"p"},"ps-mongo")," the move-to-deadletter (as it is the case with other move-to-queue operations) is atomic; in the rest, the element is first committed in the original queue and then pushed inside deadletter.")),(0,r.kt)("p",null,"When an element is moved to deadletter, the original headers are kept, and others are added:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"x-dl-from-queue"),": name of the queue the message was in"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"x-dl-t"),": ISO timestamp of the move-to-deadletter operation"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"x-dl-tries"),": number of tries at the moment of move-to-deadletter")),(0,r.kt)("h2",{id:"queue-queue-creation"},(0,r.kt)("inlineCode",{parentName:"h2"},"queue"),": Queue creation"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"// factory has been initialized\nvar q = factory.queue (<name>, <options>);\n")),(0,r.kt)("p",null,"Where:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"name"),": string to be used as queue name. Queues with the same name are in fact the same queue if they're backed in the same factory type using the same initialization data (mongodb url or redis conn-data)."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"options"),": the options passed at backend initialization are used as default values:",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"pollInterval"),": rearm or poll period in millisecs for get operations, defaults to 15000 (see ",(0,r.kt)("a",{parentName:"li",href:"../usage/no-signaller"},"Working with no signallers"),")."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"reserve_delay"),": number of seconds to keep 'reserved' status after a reserve operation. Defaults to 120."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"signaller"),": signaller to use for the queue.",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"provider"),": signaller factory."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"opts"),": options for the signaller factory (see ",(0,r.kt)("a",{parentName:"li",href:"signal"},"Signaler"),")."))),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"stats"),": stats store to use for this queue.",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"provider"),": stats factory."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"opts"),": options for the stats factory (see below).")))))),(0,r.kt)("h2",{id:"close-factory-close"},(0,r.kt)("inlineCode",{parentName:"h2"},"close"),": Factory close"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"factory.close (err => {...});\n")),(0,r.kt)("p",null,"Frees up resources on the factory. Queues created with the factory will become unusable afterwards. See ",(0,r.kt)("a",{parentName:"p",href:"/docs/usage/shutdown"},"'Shutdown process'")," for more info."))}d.isMDXComponent=!0}}]);