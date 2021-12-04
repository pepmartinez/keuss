"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[743],{3905:function(e,t,n){n.d(t,{Zo:function(){return d},kt:function(){return c}});var a=n(7294);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function r(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function l(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?r(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):r(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,a,i=function(e,t){if(null==e)return{};var n,a,i={},r=Object.keys(e);for(a=0;a<r.length;a++)n=r[a],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);for(a=0;a<r.length;a++)n=r[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var s=a.createContext({}),p=function(e){var t=a.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):l(l({},t),e)),n},d=function(e){var t=p(e.components);return a.createElement(s.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},m=a.forwardRef((function(e,t){var n=e.components,i=e.mdxType,r=e.originalType,s=e.parentName,d=o(e,["components","mdxType","originalType","parentName"]),m=p(n),c=i,k=m["".concat(s,".").concat(c)]||m[c]||u[c]||r;return n?a.createElement(k,l(l({ref:t},d),{},{components:n})):a.createElement(k,l({ref:t},d))}));function c(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var r=n.length,l=new Array(r);l[0]=m;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o.mdxType="string"==typeof e?e:i,l[1]=o;for(var p=2;p<r;p++)l[p]=n[p];return a.createElement.apply(null,l)}return a.createElement.apply(null,n)}m.displayName="MDXCreateElement"},2:function(e,t,n){n.r(t),n.d(t,{frontMatter:function(){return o},contentTitle:function(){return s},metadata:function(){return p},toc:function(){return d},default:function(){return m}});var a=n(7462),i=n(3366),r=(n(7294),n(3905)),l=["components"],o={id:"queue",title:"Queue API",sidebar_label:"Queue"},s=void 0,p={unversionedId:"api/queue",id:"api/queue",isDocsHomePage:!1,title:"Queue API",description:"stats: Queue stats",source:"@site/docs/api/queue.md",sourceDirName:"api",slug:"/api/queue",permalink:"/keuss/docs/api/queue",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/api/queue.md",tags:[],version:"current",frontMatter:{id:"queue",title:"Queue API",sidebar_label:"Queue"},sidebar:"someSidebar",previous:{title:"Stats",permalink:"/keuss/docs/api/stats"},next:{title:"Examples",permalink:"/keuss/docs/examples"}},d=[{value:"<code>stats</code>: Queue stats",id:"stats-queue-stats",children:[],level:3},{value:"<code>name</code>: Queue name",id:"name-queue-name",children:[],level:3},{value:"<code>type</code>: Queue type",id:"type-queue-type",children:[],level:3},{value:"<code>size</code>: Queue occupation",id:"size-queue-occupation",children:[],level:3},{value:"<code>totalSize</code>: Total queue occupation",id:"totalsize-total-queue-occupation",children:[],level:3},{value:"<code>schedSize</code>: Size of Scheduled",id:"schedsize-size-of-scheduled",children:[],level:3},{value:"<code>resvSize</code>: Reserved elements size",id:"resvsize-reserved-elements-size",children:[],level:3},{value:"<code>pause</code> / <code>paused</code>: Pause/Resume",id:"pause--paused-pauseresume",children:[],level:3},{value:"<code>next_t</code>: Time of schedule of next message",id:"next_t-time-of-schedule-of-next-message",children:[],level:3},{value:"<code>push</code>: Add element to queue",id:"push-add-element-to-queue",children:[],level:3},{value:"<code>pop</code>: Get element from queue",id:"pop-get-element-from-queue",children:[],level:3},{value:"<code>cancel</code>: Cancel a pending Pop",id:"cancel-cancel-a-pending-pop",children:[],level:3},{value:"<code>ok</code>: Commit a reserved element",id:"ok-commit-a-reserved-element",children:[],level:3},{value:"<code>ko</code>: Roll back a reserved element",id:"ko-roll-back-a-reserved-element",children:[],level:3},{value:"<code>remove</code>: Delete elements from queue by id",id:"remove-delete-elements-from-queue-by-id",children:[],level:3},{value:"<code>drain</code>: Drain queue",id:"drain-drain-queue",children:[],level:3}],u={toc:d};function m(e){var t=e.components,n=(0,i.Z)(e,l);return(0,r.kt)("wrapper",(0,a.Z)({},u,n,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h3",{id:"stats-queue-stats"},(0,r.kt)("inlineCode",{parentName:"h3"},"stats"),": Queue stats"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.stats ((err, res) => {\n  ...\n})\n")),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"res")," contains usage statistics (elements inserted, elements extracted, paused status).")),(0,r.kt)("h3",{id:"name-queue-name"},(0,r.kt)("inlineCode",{parentName:"h3"},"name"),": Queue name"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"var qname = q.name ()\n")),(0,r.kt)("h3",{id:"type-queue-type"},(0,r.kt)("inlineCode",{parentName:"h3"},"type"),": Queue type"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"var qtype = q.type ()\n")),(0,r.kt)("p",null,"Returns a string with the type of the queue (the type of backend which was used to create it)."),(0,r.kt)("h3",{id:"size-queue-occupation"},(0,r.kt)("inlineCode",{parentName:"h3"},"size"),": Queue occupation"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.size ((err, res) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Returns the number of elements in the queue that are already elligible (that is, excluding scheduled elements with a schedule time in the future)."),(0,r.kt)("h3",{id:"totalsize-total-queue-occupation"},(0,r.kt)("inlineCode",{parentName:"h3"},"totalSize"),": Total queue occupation"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.totalSize ((err, res) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Returns the number of elements in the queue (that is, including scheduled elements with a schedule time in the future)."),(0,r.kt)("h3",{id:"schedsize-size-of-scheduled"},(0,r.kt)("inlineCode",{parentName:"h3"},"schedSize"),": Size of Scheduled"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.schedSize ((err, res) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Returns the number of scheduled elements in the queue (that is, those with a schedule time in the future). Returns 0 if the queue does not support scheduling."),(0,r.kt)("h3",{id:"resvsize-reserved-elements-size"},(0,r.kt)("inlineCode",{parentName:"h3"},"resvSize"),": Reserved elements size"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.resvSize ((err, res) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Returns the number of reserved elements in the queue. Returns ",(0,r.kt)("inlineCode",{parentName:"p"},"null")," if the queue does not support reserve."),(0,r.kt)("h3",{id:"pause--paused-pauseresume"},(0,r.kt)("inlineCode",{parentName:"h3"},"pause")," / ",(0,r.kt)("inlineCode",{parentName:"h3"},"paused"),": Pause/Resume"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"// pauses the queue\nq.pause (true)\n\n// resumes the queue\nq.pause (false)\n\n// gets paused status of queue\nq.paused ((err, is_paused) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Pauses/Resumes all consumers on this queue (calls to ",(0,r.kt)("inlineCode",{parentName:"p"},"pop()"),"). Producers are not afected (calls to ",(0,r.kt)("inlineCode",{parentName:"p"},"push()"),")."),(0,r.kt)("p",null,"The pause/resume condition is propagated via the signallers, so this affects all consumers, not only those local to the process, if a redis-pubsub or mongo-capped signaller is used."),(0,r.kt)("p",null,"Also, the paused condition is stored as stats, so any new call to ",(0,r.kt)("inlineCode",{parentName:"p"},"pop()")," will honor it."),(0,r.kt)("h3",{id:"next_t-time-of-schedule-of-next-message"},(0,r.kt)("inlineCode",{parentName:"h3"},"next_t"),": Time of schedule of next message"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.next_t ((err, res) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Returns a ",(0,r.kt)("inlineCode",{parentName:"p"},"Date"),", or ",(0,r.kt)("inlineCode",{parentName:"p"},"null")," if queue is empty. Queues with no support for schedule/delay always return `null"),(0,r.kt)("h3",{id:"push-add-element-to-queue"},(0,r.kt)("inlineCode",{parentName:"h3"},"push"),": Add element to queue"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.push (payload, [opts,] (err, res) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Adds payload to the queue and calls passed callback upon completion. Callback's ",(0,r.kt)("em",{parentName:"p"},"res")," will contain the id assigned to the inserted element, if the backup provides one."),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"payload")," can be an ",(0,r.kt)("inlineCode",{parentName:"p"},"object"),", ",(0,r.kt)("inlineCode",{parentName:"p"},"array"),", ",(0,r.kt)("inlineCode",{parentName:"p"},"string"),", ",(0,r.kt)("inlineCode",{parentName:"p"},"number")," or ",(0,r.kt)("inlineCode",{parentName:"p"},"Buffer")),(0,r.kt)("p",null,"Possible opts:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"mature"),": unix timestamp where the element would be elligible for extraction. It is guaranteed that the element won't be extracted before this time."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"delay"),": delay in seconds to calculate the mature timestamp, if mature is not provided. For example, a delay=120 guarantees the element won't be extracted until 120 secs have elapsed ",(0,r.kt)("em",{parentName:"li"},"at least"),"."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"tries"),": value to initialize the retry counter, defaults to 0 (still no retries)."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"hdrs"),": object with scalar-valued keys (ie, string, number or boolean) to be added alongside the ",(0,r.kt)("inlineCode",{parentName:"li"},"payload")," as general purpose headers")),(0,r.kt)("div",{className:"admonition admonition-note alert alert--secondary"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"}))),"note")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},(0,r.kt)("strong",{parentName:"p"},"mature")," and ",(0,r.kt)("strong",{parentName:"p"},"delay")," have no effect if the backend does not support delay/schedule."))),(0,r.kt)("h3",{id:"pop-get-element-from-queue"},(0,r.kt)("inlineCode",{parentName:"h3"},"pop"),": Get element from queue"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"var tr = q.pop (cid, [opts,] (err, res) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Obtains an element from the queue. Callback is called with the element obtained if any, or if an error happened. If defined, the operation will wait for ",(0,r.kt)("inlineCode",{parentName:"p"},"opts.timeout")," seconds for an element to appear in the queue before bailing out (with both ",(0,r.kt)("inlineCode",{parentName:"p"},"err")," and ",(0,r.kt)("inlineCode",{parentName:"p"},"res")," being null). However, it immediately returns an id that can be used to cancel the operation at anytime."),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"*cid*")," is an string that identifies the consumer entity; it is used only for debugging purposes."),(0,r.kt)("p",null,"Possible opts:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("strong",{parentName:"li"},"timeout"),": milliseconds to wait for an elligible element to appear in the queue to be returned. If not defined it will wait forever"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("strong",{parentName:"li"},"reserve"),": if ",(0,r.kt)("inlineCode",{parentName:"li"},"true")," the element is only reserved, not completely returned. This means either ",(0,r.kt)("em",{parentName:"li"},"ok")," or ",(0,r.kt)("em",{parentName:"li"},"ko")," operations are needed upon the obtained element once processed, otherwise the element will be rolled back (and made available again) at some point in the future (this is only available on backends capable of reserve/commit).")),(0,r.kt)("h3",{id:"cancel-cancel-a-pending-pop"},(0,r.kt)("inlineCode",{parentName:"h3"},"cancel"),": Cancel a pending Pop"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"var tr = q.pop (cid, opts, (err, res) => {...});\n.\n.\n.\nq.cancel (tr);\n")),(0,r.kt)("p",null,"Cancels a pending ",(0,r.kt)("inlineCode",{parentName:"p"},"pop")," operation, identified by the value returned by ",(0,r.kt)("inlineCode",{parentName:"p"},"pop()")),(0,r.kt)("p",null,"If no ",(0,r.kt)("inlineCode",{parentName:"p"},"tr")," param is passed, or it is ",(0,r.kt)("inlineCode",{parentName:"p"},"null"),", all pending ",(0,r.kt)("inlineCode",{parentName:"p"},"pop")," operations on the queue are cancelled. Cancelled ",(0,r.kt)("inlineCode",{parentName:"p"},"pop")," operations will get ",(0,r.kt)("inlineCode",{parentName:"p"},"'cancel'")," (a string) in the ",(0,r.kt)("inlineCode",{parentName:"p"},"error")," parameter value of the callback."),(0,r.kt)("h3",{id:"ok-commit-a-reserved-element"},(0,r.kt)("inlineCode",{parentName:"h3"},"ok"),": Commit a reserved element"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.ok (id, (err, res) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Commits a reserved element by its id (the id would be assigned to ",(0,r.kt)("inlineCode",{parentName:"p"},"res._id")," on the ",(0,r.kt)("inlineCode",{parentName:"p"},"res")," param of ",(0,r.kt)("inlineCode",{parentName:"p"},"pop()")," operation). This effectively erases the element from the queue."),(0,r.kt)("p",null,"Alternatively, you can pass the entire ",(0,r.kt)("inlineCode",{parentName:"p"},"res")," object from the ",(0,r.kt)("inlineCode",{parentName:"p"},"pop()")," operation:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"var tr = q.pop ('my-consumer-id', {reserve: true}, (err, res) => {\n  // do something with res\n  ...\n\n  // commit it\n  q.ok (res, (err, res) => {\n    ...\n  });\n});\n")),(0,r.kt)("h3",{id:"ko-roll-back-a-reserved-element"},(0,r.kt)("inlineCode",{parentName:"h3"},"ko"),": Roll back a reserved element"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.ko (id, next_t, (err, res) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Rolls back a reserved element by its id (the id would be at ",(0,r.kt)("inlineCode",{parentName:"p"},"res._id")," on the ",(0,r.kt)("inlineCode",{parentName:"p"},"res")," param of ",(0,r.kt)("inlineCode",{parentName:"p"},"pop()")," operation). This effectively makes the element available again at the queue, marking it to be mature at ",(0,r.kt)("inlineCode",{parentName:"p"},"next_t")," (",(0,r.kt)("inlineCode",{parentName:"p"},"next_t")," being a millsec-unixtime). If no ",(0,r.kt)("inlineCode",{parentName:"p"},"next_t")," is specified or a ",(0,r.kt)("inlineCode",{parentName:"p"},"null")," is passed, ",(0,r.kt)("inlineCode",{parentName:"p"},"now()")," is assumed."),(0,r.kt)("p",null,"the ",(0,r.kt)("inlineCode",{parentName:"p"},"res")," param of the callback can take the following values:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"true")," if all went ok and an element was in fact rolled back"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},"nullish")," if the element does not exist in the queue"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"'deadletter'")," (as string) if the rollback resulted in the element being moved to deadletter ")),(0,r.kt)("p",null,"As with ",(0,r.kt)("inlineCode",{parentName:"p"},"ok()"),", you can use the entire ",(0,r.kt)("inlineCode",{parentName:"p"},"res")," object as ",(0,r.kt)("inlineCode",{parentName:"p"},"id"),":"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"var tr = q.pop ('my-consumer-id', {reserve: true}, (err, res) => {\n  // do something with res\n  ...\n\n  // commit or rollback it\n  if (succeed) q.ok (res, (err, res) => {\n    ...\n  })\n  else q.ko (res, (err, res) => {\n    if (res === 'deadletter') {\n      // moved to deadletter\n      ...\n    }\n    ...\n  })\n});\n")),(0,r.kt)("div",{className:"admonition admonition-important alert alert--info"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z"}))),"important")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"You must pass the entire ",(0,r.kt)("inlineCode",{parentName:"p"},"res")," object for the ",(0,r.kt)("a",{parentName:"p",href:"../api/factory#dead-letter"},"deadletter")," feature to work; even if activated at the factory, ",(0,r.kt)("inlineCode",{parentName:"p"},"ko()")," will not honor deadletter if you only pass the ",(0,r.kt)("inlineCode",{parentName:"p"},"res._id")," as ",(0,r.kt)("inlineCode",{parentName:"p"},"id"),"."))),(0,r.kt)("h3",{id:"remove-delete-elements-from-queue-by-id"},(0,r.kt)("inlineCode",{parentName:"h3"},"remove"),": Delete elements from queue by id"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.remove (id, (err, res) => {\n  ...\n})\n")),(0,r.kt)("p",null,"Remvoes an element from a queue, by using the id returned at insertion time (backends supporting ",(0,r.kt)("inlineCode",{parentName:"p"},"remove")," will return an in upon insertion). A reserved element can not be removed, and will be considered as nonexistent"),(0,r.kt)("p",null,"the ",(0,r.kt)("inlineCode",{parentName:"p"},"res")," param of the callback can take the following values:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"true")," if all went ok and the element was removed"),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},"nullish")," if the element does not exist in the queue")),(0,r.kt)("h3",{id:"drain-drain-queue"},(0,r.kt)("inlineCode",{parentName:"h3"},"drain"),": Drain queue"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"q.drain (err => {\n  ...\n})\n")),(0,r.kt)("p",null,"Drains a queue. This is a needed operation when a backend does read-ahead upon a ",(0,r.kt)("inlineCode",{parentName:"p"},"pop()"),", or buffers ",(0,r.kt)("inlineCode",{parentName:"p"},"push()")," operations for later; in this case, you may want to be sure that all extra elemens read are actually popped, and all pending pushes are committed."),(0,r.kt)("div",{className:"admonition admonition-warning alert alert--danger"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"12",height:"16",viewBox:"0 0 12 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M5.05.31c.81 2.17.41 3.38-.52 4.31C3.55 5.67 1.98 6.45.9 7.98c-1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-.3-6.61-.61 2.03.53 3.33 1.94 2.86 1.39-.47 2.3.53 2.27 1.67-.02.78-.31 1.44-1.13 1.81 3.42-.59 4.78-3.42 4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52.13-2.03 1.13-1.89 2.75.09 1.08-1.02 1.8-1.86 1.33-.67-.41-.66-1.19-.06-1.78C8.18 5.31 8.68 2.45 5.05.32L5.03.3l.02.01z"}))),"warning")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"'drain' will immediately inhibit ",(0,r.kt)("inlineCode",{parentName:"p"},"push()"),": any call to ",(0,r.kt)("inlineCode",{parentName:"p"},"push()")," will immediately result in a ",(0,r.kt)("inlineCode",{parentName:"p"},"'drain'")," (a string)  in the ",(0,r.kt)("inlineCode",{parentName:"p"},"error")," parameter value of the callback. The callback will be called when all pending pushes are committed, and all read-ahead on a pop() has been actually popped."))),(0,r.kt)("p",null,"Also, ",(0,r.kt)("inlineCode",{parentName:"p"},"drain()")," will also call ",(0,r.kt)("inlineCode",{parentName:"p"},"cancel()")," on the queue immediately before finishing, in case of success."))}m.isMDXComponent=!0}}]);