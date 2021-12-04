"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[916],{3905:function(e,t,n){n.d(t,{Zo:function(){return u},kt:function(){return m}});var i=n(7294);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);t&&(i=i.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,i)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,i,r=function(e,t){if(null==e)return{};var n,i,r={},a=Object.keys(e);for(i=0;i<a.length;i++)n=a[i],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(i=0;i<a.length;i++)n=a[i],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var s=i.createContext({}),p=function(e){var t=i.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},u=function(e){var t=p(e.components);return i.createElement(s.Provider,{value:t},e.children)},c={inlineCode:"code",wrapper:function(e){var t=e.children;return i.createElement(i.Fragment,{},t)}},d=i.forwardRef((function(e,t){var n=e.components,r=e.mdxType,a=e.originalType,s=e.parentName,u=l(e,["components","mdxType","originalType","parentName"]),d=p(n),m=r,k=d["".concat(s,".").concat(m)]||d[m]||c[m]||a;return n?i.createElement(k,o(o({ref:t},u),{},{components:n})):i.createElement(k,o({ref:t},u))}));function m(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var a=n.length,o=new Array(a);o[0]=d;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:r,o[1]=l;for(var p=2;p<a;p++)o[p]=n[p];return i.createElement.apply(null,o)}return i.createElement.apply(null,n)}d.displayName="MDXCreateElement"},962:function(e,t,n){n.r(t),n.d(t,{frontMatter:function(){return l},contentTitle:function(){return s},metadata:function(){return p},toc:function(){return u},default:function(){return d}});var i=n(7462),r=n(3366),a=(n(7294),n(3905)),o=["components"],l={id:"processors",title:"Processors",sidebar_label:"Processors"},s=void 0,p={unversionedId:"usage/pipelines/processors",id:"usage/pipelines/processors",isDocsHomePage:!1,title:"Processors",description:"A small hierarchy of processors is provided with Pipelines:",source:"@site/docs/usage/pipelines/processors.md",sourceDirName:"usage/pipelines",slug:"/usage/pipelines/processors",permalink:"/keuss/docs/usage/pipelines/processors",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/usage/pipelines/processors.md",tags:[],version:"current",frontMatter:{id:"processors",title:"Processors",sidebar_label:"Processors"},sidebar:"someSidebar",previous:{title:"About",permalink:"/keuss/docs/usage/pipelines/about"},next:{title:"Building",permalink:"/keuss/docs/usage/pipelines/building"}},u=[{value:"BaseLink",id:"baselink",children:[{value:"Creation",id:"creation",children:[],level:3},{value:"Methods",id:"methods",children:[],level:3},{value:"Process Function",id:"process-function",children:[{value:"Semantic <code>this</code> in process function",id:"semantic-this-in-process-function",children:[],level:4}],level:3},{value:"Events",id:"events",children:[],level:3}],level:2},{value:"DirectLink",id:"directlink",children:[{value:"Creation",id:"creation-1",children:[],level:3},{value:"Methods",id:"methods-1",children:[],level:3},{value:"Process Function",id:"process-function-1",children:[],level:3}],level:2},{value:"ChoiceLink",id:"choicelink",children:[{value:"Creation",id:"creation-2",children:[],level:3},{value:"Methods",id:"methods-2",children:[],level:3},{value:"Process Function",id:"process-function-2",children:[],level:3}],level:2},{value:"Sink",id:"sink",children:[{value:"Creation",id:"creation-3",children:[],level:3},{value:"Methods",id:"methods-3",children:[],level:3},{value:"Process Function",id:"process-function-3",children:[],level:3}],level:2}],c={toc:u};function d(e){var t=e.components,n=(0,r.Z)(e,o);return(0,a.kt)("wrapper",(0,i.Z)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("p",null,"A small hierarchy of processors is provided with Pipelines:"),(0,a.kt)("h2",{id:"baselink"},"BaseLink"),(0,a.kt)("p",null,"Common base for all Processors, provides all the functionality common to all. It can not be used directly"),(0,a.kt)("h3",{id:"creation"},"Creation"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-javascript"},"const bl = new BaseLink (src_q, opts)\n")),(0,a.kt)("p",null,"Although not intended to be instantiated, this serves as common initialization to all Processors"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},(0,a.kt)("inlineCode",{parentName:"p"},"src_q")," must be a pipelined queue")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},(0,a.kt)("inlineCode",{parentName:"p"},"opts")," can contain:"),(0,a.kt)("ul",{parentName:"li"},(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},(0,a.kt)("inlineCode",{parentName:"p"},"retry_factor_t, retry_base_t"),": they control the delay imposed to an element when it is rolled back. The formula is"),(0,a.kt)("p",{parentName:"li"},(0,a.kt)("inlineCode",{parentName:"p"},"delay-in-seconds = item.tries * retry_factor_t + retry_base_t")),(0,a.kt)("p",{parentName:"li"},"They default to ",(0,a.kt)("inlineCode",{parentName:"p"},"2")," and ",(0,a.kt)("inlineCode",{parentName:"p"},"1")," respectively")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},(0,a.kt)("inlineCode",{parentName:"p"},"mature"),": Date instance or unix timestamp (in milliseconds, as integer) expressing the not-before timestamp for the item, to be used when calling ",(0,a.kt)("inlineCode",{parentName:"p"},"pl_step()")," in the src queue")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},(0,a.kt)("inlineCode",{parentName:"p"},"delay"),": delay in seconds to calculate ",(0,a.kt)("inlineCode",{parentName:"p"},"mature"),", if ",(0,a.kt)("inlineCode",{parentName:"p"},"mature")," is not specified"))))),(0,a.kt)("h3",{id:"methods"},"Methods"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"src()"),": returns src queue"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"name()"),": returns Processor name"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"on_data(fn)"),": specifies the process function to be applied to each element"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"start(fn)"),": starts the processor. Optionally, a process function can be passed; if not passed the process function must have been previously specified using ",(0,a.kt)("inlineCode",{parentName:"li"},"on_data()")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"stop()"),": stops the Processor")),(0,a.kt)("h3",{id:"process-function"},"Process Function"),(0,a.kt)("p",null,"The function passed into ",(0,a.kt)("inlineCode",{parentName:"p"},"on_data()")," or ",(0,a.kt)("inlineCode",{parentName:"p"},"start()")," provides the processor logic; this function is referred to as ",(0,a.kt)("em",{parentName:"p"},"processor function"),". This function is called on each step of the Processor loop with the reserved item, and it is expected to calls its callback once done with the item. The way the function calls the callback determines what happens with the item afterwards"),(0,a.kt)("p",null,"The function looks like this:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-javascript"},"function (item, cb) {\n  ...\n})\n")),(0,a.kt)("p",null,"The ",(0,a.kt)("inlineCode",{parentName:"p"},"item")," is received exactly as it comes as result of a (successful) ",(0,a.kt)("inlineCode",{parentName:"p"},"reserve()")," call on the source queue; after processing the item ",(0,a.kt)("inlineCode",{parentName:"p"},"cb")," should be called once to finish the processing of ",(0,a.kt)("inlineCode",{parentName:"p"},"item")," and proceed with the next loop cycle. The callback has the following signature:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-javascript"},"  cb (err, res);\n")),(0,a.kt)("p",null,"where:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},"if ",(0,a.kt)("inlineCode",{parentName:"p"},"err")," is not nil"),(0,a.kt)("ul",{parentName:"li"},(0,a.kt)("li",{parentName:"ul"},"if ",(0,a.kt)("inlineCode",{parentName:"li"},"err.drop")," is exactly ",(0,a.kt)("inlineCode",{parentName:"li"},"true")," the item is committed in the src queue and therefore dropped from the pipeline"),(0,a.kt)("li",{parentName:"ul"},"else the item is rolled back in the src queue, using the processor's ",(0,a.kt)("inlineCode",{parentName:"li"},"retry_factor_t")," and ",(0,a.kt)("inlineCode",{parentName:"li"},"retry_base_t")," to calculate the retry delay. If the queue was created with deadletter support, the item would be moved to the deadletter queue if it has reached its maximum number of rollbacks; in such case, the movement into deadletter is also atomic"))),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},"else (if ",(0,a.kt)("inlineCode",{parentName:"p"},"err")," is nill)"),(0,a.kt)("ul",{parentName:"li"},(0,a.kt)("li",{parentName:"ul"},"if (",(0,a.kt)("inlineCode",{parentName:"li"},"res.drop")," is exactly ",(0,a.kt)("inlineCode",{parentName:"li"},"true")," the item is committed in the src queue and therefore dropped from the pipeline"),(0,a.kt)("li",{parentName:"ul"},"else the item is passed to the text queue in the pipeline (by means of ",(0,a.kt)("inlineCode",{parentName:"li"},"pl_next()"),")",(0,a.kt)("ul",{parentName:"li"},(0,a.kt)("li",{parentName:"ul"},"if ",(0,a.kt)("inlineCode",{parentName:"li"},"res.mature")," or ",(0,a.kt)("inlineCode",{parentName:"li"},"res.delay")," exist (or they were specified at the processor's creation) they are used to calculate the delay/mature of the element in the destination queue"),(0,a.kt)("li",{parentName:"ul"},"if ",(0,a.kt)("inlineCode",{parentName:"li"},"res.payload")," exists it is used to replace the item's payload entirely"),(0,a.kt)("li",{parentName:"ul"},"else if ",(0,a.kt)("inlineCode",{parentName:"li"},"res.update")," exists it is used as mongodb-update operations on the item's payload")))),(0,a.kt)("p",{parentName:"li"},"All those operations happen in an atomic way"))),(0,a.kt)("h4",{id:"semantic-this-in-process-function"},"Semantic ",(0,a.kt)("inlineCode",{parentName:"h4"},"this")," in process function"),(0,a.kt)("p",null,"The function is bound to the processor, so the function can access and use processor's primitives. For example, it can insert copies of the item, or new items, in any of the source or destination queues"),(0,a.kt)("p",null,"In order to use this functionality the process function can not be declared as an 'arrow' function, since those can not be bound. Use the classic ",(0,a.kt)("inlineCode",{parentName:"p"},"function xxxx (item, cb) {...}")," if you intend to access the underlying Processor"),(0,a.kt)("h3",{id:"events"},"Events"),(0,a.kt)("p",null,"BaseLink inherits from ",(0,a.kt)("inlineCode",{parentName:"p"},"EventEmitter")," and publishes the following events:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"error"),": an error happened in the internal loop. It comes with one parameter, an object with the following fields:",(0,a.kt)("ul",{parentName:"li"},(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"on"),": exact type of error:",(0,a.kt)("ul",{parentName:"li"},(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"src-queue-pop"),": error while reserving an element on the src queue"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"src-queue-commit-on-error"),": error while committing an element on the src queue when an error was passed and ",(0,a.kt)("inlineCode",{parentName:"li"},"err.drop==true")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"src-queue-rollback-on-error"),": error while rolling back an element on the src queue when an error was passed"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"src-queue-commit-on-drop"),": error while committing an element an element on the src queue when processed ok and ",(0,a.kt)("inlineCode",{parentName:"li"},"res.drop==true")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"next-queue"),": error while atomically moving the element to the next queue"))),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"elem"),": element that caused the error. Not present in ",(0,a.kt)("inlineCode",{parentName:"li"},"src-queue-pop")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"error"),": original error object"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"opts"),": (only present in ",(0,a.kt)("inlineCode",{parentName:"li"},"next-queue"),") options passed internally to ",(0,a.kt)("inlineCode",{parentName:"li"},"pl_step()"))))),(0,a.kt)("h2",{id:"directlink"},"DirectLink"),(0,a.kt)("p",null,"Processor that connects the source queue to exactly one destination queue:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"}," src-queue --\x3e DirectLink --\x3e dst-queue\n")),(0,a.kt)("h3",{id:"creation-1"},"Creation"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-javascript"},"const PDL = require ('keuss/Pipeline/DirectLink');\nconst bl = new PDL (src_q, dst_q, opts);\n")),(0,a.kt)("p",null,"In addition to ",(0,a.kt)("inlineCode",{parentName:"p"},"BaseLink"),":"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"dst_q")," must be a pipelined queue; also, both ",(0,a.kt)("inlineCode",{parentName:"li"},"src_q")," and ",(0,a.kt)("inlineCode",{parentName:"li"},"dst_q")," must be of the same type and must belong to the same pipeline")),(0,a.kt)("h3",{id:"methods-1"},"Methods"),(0,a.kt)("p",null,"In addition to those of ",(0,a.kt)("inlineCode",{parentName:"p"},"BaseLink")),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"dst()"),": returns destination queue")),(0,a.kt)("h3",{id:"process-function-1"},"Process Function"),(0,a.kt)("p",null,"In the case of successful processing (i.e.: no ",(0,a.kt)("inlineCode",{parentName:"p"},"err")," in the callback invocation) the item is atomically moved to the ",(0,a.kt)("inlineCode",{parentName:"p"},"dst")," queue."),(0,a.kt)("p",null,"No other semantics are added to the process function."),(0,a.kt)("h2",{id:"choicelink"},"ChoiceLink"),(0,a.kt)("p",null,"Processor that connects the source queue to an array of queues; after processing, each item would be moved to exactly one of those queues:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"},"                            |--\x3e dst-queue-0\n                            |--\x3e dst-queue-1\n src-queue --\x3e ChoiceLink --|--\x3e dst-queue-2\n                            |    ...\n                            |--\x3e dst-queue-n\n")),(0,a.kt)("h3",{id:"creation-2"},"Creation"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-javascript"},"const PCL = require ('keuss/Pipeline/ChoiceLink');\nconst cl = new PCL (src_q, array_of_dst_queues, opts);\n")),(0,a.kt)("p",null,"In addition to ",(0,a.kt)("inlineCode",{parentName:"p"},"BaseLink"),":"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"array_of_dst_queues")," must be an array of pipelined queues; each one must be of the same type and must belong to the same pipeline than ",(0,a.kt)("inlineCode",{parentName:"li"},"src_q"))),(0,a.kt)("h3",{id:"methods-2"},"Methods"),(0,a.kt)("p",null,"In addition to those of ",(0,a.kt)("inlineCode",{parentName:"p"},"BaseLink"),":"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"dst_by_idx(idx)"),": returns destination queue from the array, selected by array index (integer)"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"dst_by_name(name)"),": returns destination queue from the array, selected by queue name (string)"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"dst_dimension ()"),": returns number of possible destination queues"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"dst_names ()"),": returns an array with the names of all dst queues")),(0,a.kt)("h3",{id:"process-function-2"},"Process Function"),(0,a.kt)("p",null,"ChoiceLink expects an ",(0,a.kt)("inlineCode",{parentName:"p"},"res.dst")," in the callback invocation, which must fullfill one of those conditions:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"be an integer and resolve to a valid element when applied as index to the array of destination queues"),(0,a.kt)("li",{parentName:"ul"},"be a string and correspond to the name of one of the destination queues")),(0,a.kt)("p",null,"The element will be moved atomically to the specified destination queue upon successful processing (i.e.: no ",(0,a.kt)("inlineCode",{parentName:"p"},"err"),"in the callback invocation)"),(0,a.kt)("h2",{id:"sink"},"Sink"),(0,a.kt)("p",null,"Processor that connects the source queue to exactly zero destination queue. That is, a termination point: successfully processed elements are always removed from the pipeline"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"}," src-queue --\x3e Sink\n")),(0,a.kt)("h3",{id:"creation-3"},"Creation"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-javascript"},"const PS = require ('keuss/Pipeline/Sink');\nconst bl = new PS (src_q, opts);\n")),(0,a.kt)("p",null,"No extra parameters are expected in addition to those of ",(0,a.kt)("inlineCode",{parentName:"p"},"BaseLink")),(0,a.kt)("h3",{id:"methods-3"},"Methods"),(0,a.kt)("p",null,"No extra methods are provided in addition to those of ",(0,a.kt)("inlineCode",{parentName:"p"},"BaseLink")),(0,a.kt)("h3",{id:"process-function-3"},"Process Function"),(0,a.kt)("p",null,"In the case of successful processing (i.e.: no ",(0,a.kt)("inlineCode",{parentName:"p"},"err")," in the callback invocation) the item is removed from the pipeline, exactly as if ",(0,a.kt)("inlineCode",{parentName:"p"},"res.drop")," were specified. Actually, ",(0,a.kt)("inlineCode",{parentName:"p"},"res")," is totally ignored"))}d.isMDXComponent=!0}}]);