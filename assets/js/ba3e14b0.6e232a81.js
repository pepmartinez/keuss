"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[144],{3905:function(e,t,n){n.d(t,{Zo:function(){return c},kt:function(){return d}});var r=n(7294);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},o=Object.keys(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var i=r.createContext({}),u=function(e){var t=r.useContext(i),n=t;return e&&(n="function"==typeof e?e(t):s(s({},t),e)),n},c=function(e){var t=u(e.components);return r.createElement(i.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},m=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,o=e.originalType,i=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),m=u(n),d=a,h=m["".concat(i,".").concat(d)]||m[d]||p[d]||o;return n?r.createElement(h,s(s({ref:t},c),{},{components:n})):r.createElement(h,s({ref:t},c))}));function d(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var o=n.length,s=new Array(o);s[0]=m;var l={};for(var i in t)hasOwnProperty.call(t,i)&&(l[i]=t[i]);l.originalType=e,l.mdxType="string"==typeof e?e:a,s[1]=l;for(var u=2;u<o;u++)s[u]=n[u];return r.createElement.apply(null,s)}return r.createElement.apply(null,n)}m.displayName="MDXCreateElement"},8031:function(e,t,n){n.r(t),n.d(t,{frontMatter:function(){return l},contentTitle:function(){return i},metadata:function(){return u},toc:function(){return c},default:function(){return m}});var r=n(7462),a=n(3366),o=(n(7294),n(3905)),s=["components"],l={id:"putting-all-together",title:"Putting all together",sidebar_label:"Putting all together"},i=void 0,u={unversionedId:"usage/putting-all-together",id:"usage/putting-all-together",isDocsHomePage:!1,title:"Putting all together",description:"Factory initialization",source:"@site/docs/usage/putting-all-together.md",sourceDirName:"usage",slug:"/usage/putting-all-together",permalink:"/keuss/docs/usage/putting-all-together",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/usage/putting-all-together.md",tags:[],version:"current",frontMatter:{id:"putting-all-together",title:"Putting all together",sidebar_label:"Putting all together"},sidebar:"someSidebar",previous:{title:"Concepts",permalink:"/keuss/docs/concepts"},next:{title:"Bucket-based backends",permalink:"/keuss/docs/usage/buckets"}},c=[{value:"Factory initialization",id:"factory-initialization",children:[],level:2},{value:"Queue creation",id:"queue-creation",children:[],level:2},{value:"Put elements in queue (push)",id:"put-elements-in-queue-push",children:[],level:2},{value:"Get elements from queue (pop)",id:"get-elements-from-queue-pop",children:[],level:2},{value:"Reserve-commit-rollback",id:"reserve-commit-rollback",children:[],level:2},{value:"Termination",id:"termination",children:[],level:2}],p={toc:c};function m(e){var t=e.components,n=(0,a.Z)(e,s);return(0,o.kt)("wrapper",(0,r.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("h2",{id:"factory-initialization"},"Factory initialization"),(0,o.kt)("p",null,"First, choose a factory, also known as backend:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"const MQ = require ('../../backends/mongo');\n")),(0,o.kt)("p",null,"Then, simply execute the backend, passing the config, to obtain a working factory:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"MQ ({\n  url: 'mongodb://localhost/keuss_test'\n}, (err, factory) => {\n  if (err) return console.error(err);\n\n  // factory is ready to be used\n\n}\n")),(0,o.kt)("p",null,"You can create and use as many factories as desided, from the same or many backends"),(0,o.kt)("h2",{id:"queue-creation"},"Queue creation"),(0,o.kt)("p",null,"You use the factory to create queues:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"const q1 = factory.queue ('test_queue_1', {});\nconst q2 = factory.queue ('test_queue_2', {});\n")),(0,o.kt)("p",null,"A queue can be created more than once with the same name, inside the same factory (this is a common procedure when consumer and producer are separated). The effect would be virtually the same as sharing the queue:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"const q_consumer = factory.queue ('test_queue', {});\nconst q_producer = factory.queue ('test_queue', {});\n")),(0,o.kt)("h2",{id:"put-elements-in-queue-push"},"Put elements in queue (push)"),(0,o.kt)("p",null,"putting elements in a queue is simple enough:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"const elem = {\n  elem: 1,\n  headline: 'something something',\n  tags: {\n    a: 1,\n    b: 2\n  }\n};\n\nq1.push (elem, (err, res) => {\n  // push finished, either with error or success...\n}),\n")),(0,o.kt)("p",null,"Or, push also some headers:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"const elem = {\n  elem: 1,\n  headline: 'something something',\n  tags: {\n    a: 1,\n    b: 2\n  }\n};\n\nconst headers = {\n  h1: 'a string',\n  h2: false,\n  h3: 666\n};\n\nq1.push (elem, {hdrs: headers}, (err, res) => {\n  // push finished, either with error or success...\n}),\n")),(0,o.kt)("h2",{id:"get-elements-from-queue-pop"},"Get elements from queue (pop)"),(0,o.kt)("p",null,"The easiest way to get elements from a queue is with a simple pop(). This would block until an element is ready, it would remove it from the queue and return it."),(0,o.kt)("p",null,"This way of working is often referred to as ",(0,o.kt)("em",{parentName:"p"},"at-most-once")," since it guarantees that each element in the queue will be processed no more than one time (it would be zero times, if something happens after ",(0,o.kt)("inlineCode",{parentName:"p"},"pop()")," ands but before the element is actually managed)"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"const consumer_label = 'consumer-1';\nq1.pop (consumer_label, (err, res) => {\n  if (err) return console.error (err);\n\n  console.log (res);\n      // this should print something like:\n      // {\n      //   _id: <some id>,\n      //   mature: <some date>,\n      //   payload: { elem: 1, headline: 'something something', tags: { a: 1, b: 2 } },\n      //   tries: 0\n      //   hdrs: {}\n      // }\n      // that is, the actual element is at res.payload\n      //\n      // if the element was pushed with headers, they will be placed inside hdrs:\n      //   hdrs: {h1: 'a string', h2: false, h3: 666}\n}\n")),(0,o.kt)("h2",{id:"reserve-commit-rollback"},"Reserve-commit-rollback"),(0,o.kt)("p",null,"A safer way to consume from a queue is using reserve: elements are reserved, processed and only then committed (and removed from the queue). A reserved element can also be rolled back (returned to queue) if the processing failed and the element needs to be reprocessed in the future; also, any reserved element will auto-rollback after some tiem elapsed, if neither commit nor rollback is done. This is known as ",(0,o.kt)("em",{parentName:"p"},"at-least-once")," cause it guarantees all elements wold be processed at least once"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"const consumer_label = 'consumer-1';\nq1.pop (consumer_label, {reserve: true}, (err, elem) => {\n  if (err) return console.error (err);\n\n  // res is ready to be processed\n  do_some_processing (elem.payload, err => {\n    if (err) {\n      // error, rollback so it gets retried, adding a delay\n      const next_t = new Date().getTime () + 15000;\n      q1.ko (item, next_t, () = >{\n        // the element is returned to queue, but it won't be available until 15 secs have passed\n      });\n    }\n    else {\n      // processing went fine, commit element\n      q1.ok (item, () => {\n        // the element is removed from the queue\n      });\n    }\n  });\n}\n")),(0,o.kt)("h2",{id:"termination"},"Termination"),(0,o.kt)("p",null,"Once all is done, you can free all the resources associated to the factory by closing it:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"factory.close (err => {\n  // factory is now closed and cannot be used anymore\n});\n")),(0,o.kt)("p",null,"Once a factory is closed it cannot be used, ",(0,o.kt)("em",{parentName:"p"},"and all the queues created through it will becomes unusable too")))}m.isMDXComponent=!0}}]);