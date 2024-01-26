"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[1632],{3905:(e,n,t)=>{t.d(n,{Zo:()=>u,kt:()=>p});var r=t(7294);function s(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function a(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function o(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?a(Object(t),!0).forEach((function(n){s(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):a(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function i(e,n){if(null==e)return{};var t,r,s=function(e,n){if(null==e)return{};var t,r,s={},a=Object.keys(e);for(r=0;r<a.length;r++)t=a[r],n.indexOf(t)>=0||(s[t]=e[t]);return s}(e,n);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)t=a[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(s[t]=e[t])}return s}var l=r.createContext({}),c=function(e){var n=r.useContext(l),t=n;return e&&(t="function"==typeof e?e(n):o(o({},n),e)),t},u=function(e){var n=c(e.components);return r.createElement(l.Provider,{value:n},e.children)},d={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},m=r.forwardRef((function(e,n){var t=e.components,s=e.mdxType,a=e.originalType,l=e.parentName,u=i(e,["components","mdxType","originalType","parentName"]),m=c(t),p=s,k=m["".concat(l,".").concat(p)]||m[p]||d[p]||a;return t?r.createElement(k,o(o({ref:n},u),{},{components:t})):r.createElement(k,o({ref:n},u))}));function p(e,n){var t=arguments,s=n&&n.mdxType;if("string"==typeof e||s){var a=t.length,o=new Array(a);o[0]=m;var i={};for(var l in n)hasOwnProperty.call(n,l)&&(i[l]=n[l]);i.originalType=e,i.mdxType="string"==typeof e?e:s,o[1]=i;for(var c=2;c<a;c++)o[c]=t[c];return r.createElement.apply(null,o)}return r.createElement.apply(null,t)}m.displayName="MDXCreateElement"},1794:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>o,default:()=>d,frontMatter:()=>a,metadata:()=>i,toc:()=>c});var r=t(7462),s=(t(7294),t(3905));const a={id:"quickstart",title:"Quickstart",sidebar_label:"Quickstart"},o=void 0,i={unversionedId:"quickstart",id:"quickstart",title:"Quickstart",description:"Package Install",source:"@site/docs/02-quickstart.md",sourceDirName:".",slug:"/quickstart",permalink:"/keuss/docs/quickstart",draft:!1,editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/02-quickstart.md",tags:[],version:"current",sidebarPosition:2,frontMatter:{id:"quickstart",title:"Quickstart",sidebar_label:"Quickstart"},sidebar:"tutorialSidebar",previous:{title:"About",permalink:"/keuss/docs/"},next:{title:"Concepts",permalink:"/keuss/docs/concepts"}},l={},c=[{value:"Package Install",id:"package-install",level:2},{value:"Basic usage (with regular MongoDB backend)",id:"basic-usage-with-regular-mongodb-backend",level:2},{value:"Backend interchangeability",id:"backend-interchangeability",level:2},{value:"reserve-commit-rollback",id:"reserve-commit-rollback",level:2},{value:"Backend interchangeability",id:"backend-interchangeability-1",level:2},{value:"Full producer and consumer loops",id:"full-producer-and-consumer-loops",level:2}],u={toc:c};function d(e){let{components:n,...t}=e;return(0,s.kt)("wrapper",(0,r.Z)({},u,t,{components:n,mdxType:"MDXLayout"}),(0,s.kt)("h2",{id:"package-install"},"Package Install"),(0,s.kt)("p",null,(0,s.kt)("inlineCode",{parentName:"p"},"keuss")," is installed in the regular way for any npm package:"),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre",className:"language-bash"},"npm install keuss\n")),(0,s.kt)("h2",{id:"basic-usage-with-regular-mongodb-backend"},"Basic usage (with regular MongoDB backend)"),(0,s.kt)("p",null,"Here's a minimal example of how keuss works. ",(0,s.kt)("a",{parentName:"p",href:"https://www.npmjs.com/package/async"},"async")," is used to implement asynchronous flows in a much readable manner"),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre",className:"language-javascript"},"const async = require ('async');\nconst MQ =    require ('keuss/backends/mongo');\n\nMQ ({\n  url: 'mongodb://localhost/keuss_test'\n}, (err, factory) => {\n  if (err) return console.error(err);\n\n  // factory ready, create one queue\n  const q = factory.queue ('test_queue', {});\n\n  async.series([\n    cb => q.push (\n      {elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, // this is the payload\n      {\n        hdrs: {h1: 'aaa', h2: 12, h3: false}  // let's add some headers too\n      },\n      cb\n    ),\n    cb => q.pop ('consumer-1', cb)\n  ], (err, res) => {\n    if (err) {\n      console.error (err);\n    }\n    else {\n      console.log (res[1]);\n      // this should print something like:\n      // {\n      //   _id: <some id>,\n      //   mature: <some date>,\n      //   payload: { elem: 1, headline: 'something something', tags: { a: 1, b: 2 } },\n      //   tries: 0,\n      //   hdrs: {h1: 'aaa', h2: 12, h3: false}\n      // }\n    }\n\n    factory.close ();\n  });\n});\n")),(0,s.kt)("p",null,"This small test creates a queue named ",(0,s.kt)("inlineCode",{parentName:"p"},"test_queue")," backed by mongodb in the mongoDB collection at ",(0,s.kt)("inlineCode",{parentName:"p"},"mongodb://localhost/keuss_test"),". Then, a single element is first inserted in the queue, then read from it and printed"),(0,s.kt)("h2",{id:"backend-interchangeability"},"Backend interchangeability"),(0,s.kt)("p",null,"This example works with any available definition of ",(0,s.kt)("inlineCode",{parentName:"p"},"MQ"),"; you just need to specify the chosen backend. For example, to use the ",(0,s.kt)("inlineCode",{parentName:"p"},"redis-list")," backend:"),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre",className:"language-js"},"const MQ = require ('keuss/backends/redis-list');\n")),(0,s.kt)("h2",{id:"reserve-commit-rollback"},"reserve-commit-rollback"),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre",className:"language-javascript"},"const async = require ('async');\nconst MQ =    require ('keuss/backends/mongo');\n\nMQ ({\n  url: 'mongodb://localhost/keuss_test'\n}, (err, factory) => {\n  if (err) return console.error(err);\n\n  // factory ready, create one queue\n  const q = factory.queue ('test_queue', {});\n\n  async.waterfall ([\n    cb => q.push ({elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, cb),  // (1)\n    (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb),                         // (2)\n    (item, cb) => {\n      console.log ('%s: got %o', new Date().toString (), item);                         // (3)\n      const next_t = new Date().getTime () + 1500;\n      q.ko (item, next_t, cb);                                                          // (4)\n    },\n    (ko_res, cb) => q.pop ('consumer-1', {reserve: true}, cb),                          // (5)\n    (item, cb) => {\n      console.log ('%s: got %o', new Date().toString (), item);                         // (6)\n      q.ok (item, cb);                                                                  // (7)\n    },\n  ], (err, res) => {\n    if (err) console.error (err);\n    factory.close ();\n  });\n});\n")),(0,s.kt)("ol",null,(0,s.kt)("li",{parentName:"ol"},"An element is inserted."),(0,s.kt)("li",{parentName:"ol"},"An element is reserved. It reserves the element previously inserted, and returns it."),(0,s.kt)("li",{parentName:"ol"},"This should print the element reserved."),(0,s.kt)("li",{parentName:"ol"},"The element reserved is rejected, indicating that it should not be made available until ",(0,s.kt)("inlineCode",{parentName:"li"},"now + 1500")," millisecs."),(0,s.kt)("li",{parentName:"ol"},"A second attempt at a reserve, this should return an element after 1500 millisecs."),(0,s.kt)("li",{parentName:"ol"},"The same element should be printed here, except for the ",(0,s.kt)("inlineCode",{parentName:"li"},"tries")," that should be ",(0,s.kt)("inlineCode",{parentName:"li"},"1")," instead of ",(0,s.kt)("inlineCode",{parentName:"li"},"0"),"."),(0,s.kt)("li",{parentName:"ol"},"The element is committed and thus removed from the queue.")),(0,s.kt)("h2",{id:"backend-interchangeability-1"},"Backend interchangeability"),(0,s.kt)("p",null,"This example works with any definition of ",(0,s.kt)("inlineCode",{parentName:"p"},"MQ")," that supports reserve/commit (that is, any except ",(0,s.kt)("inlineCode",{parentName:"p"},"redis-list"),"); you just need to specify the chosen backend. For example, to use the ",(0,s.kt)("inlineCode",{parentName:"p"},"bucket-mongo-safe")," backend:"),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre",className:"language-js"},"const MQ = require ('keuss/backends/bucket-mongo-safe');\n")),(0,s.kt)("h2",{id:"full-producer-and-consumer-loops"},"Full producer and consumer loops"),(0,s.kt)("p",null,"This is a more convoluted example: a set of producers inserting messages, and another set of consumers consumig them, all in parallel. The queue stats (elements pushed, elements popped) are shown every second."),(0,s.kt)("p",null,"Try and change the uncommented ",(0,s.kt)("inlineCode",{parentName:"p"},"const MQ = require('keuss/backends/...');"),"  to see the performance differences between backends."),(0,s.kt)("p",null,"Also, notice that, when, running with any mongodb-based backend, stats figures are cumulative across different executions: if you run it several times, you'll see the stats' figures also include data from previous executions."),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre",className:"language-js"},"const async = require ('async');\n\n// choice of backend\nconst MQ =    require ('keuss/backends/bucket-mongo-safe');\n//const MQ =    require ('keuss/backends/redis-oq');\n//const MQ =    require ('keuss/backends/mongo');\n//const MQ =    require ('keuss/backends/ps-mongo');\n\nMQ ({\n  url: 'mongodb://localhost/keuss_test'\n}, (err, factory) => {\n  if (err) return console.error(err);\n\n  const consumers = 3;\n  const producers = 3;\n  const msgs = 100000;\n\n  // factory ready, create one queue\n  const q = factory.queue ('test_queue', {});\n\n  // show stats every sec\n  const timer = setInterval (() => {\n    q.stats ((err, res) => console.log ('  --\x3e stats now: %o', res));\n  }, 1000);\n\n  async.parallel ([\n    // producers' loop\n    cb => async.timesLimit (msgs, producers, (n, next) => {\n      q.push ({elem: n, headline: 'something something', tags: {a: 1, b: 2}}, next);\n    }, err => {\n      console.log ('producer loop ended');\n      cb (err);\n    }),\n    // consumers' loop\n    cb => async.timesLimit (msgs, consumers, (n, next) => {\n      q.pop ('theconsumer', {reserve: true}, (err, item) => {\n        if (err) return cb (err);\n        q.ok (item, next);\n      });\n    }, err => {\n      console.log ('consumer loop ended');\n      cb (err);\n    })\n  ], err => {\n    if (err) return console.error (err);\n\n    clearInterval (timer);\n\n    // all loops completed, cleanup & show stats\n    async.series ([\n      cb => q.drain (cb),\n      cb => q.stats (cb),\n      cb => setTimeout (cb, 1000),\n      cb => q.stats (cb),\n    ], (err, res) => {\n      if (err) console.error (err);\n      else {\n        console.log ('stats right after drain: %o', res[1]);\n        console.log ('stats once dust settled: %o', res[3]);\n      }\n\n      factory.close ();\n    });\n  });\n});\n")))}d.isMDXComponent=!0}}]);