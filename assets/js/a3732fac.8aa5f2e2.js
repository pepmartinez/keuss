"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[253],{3905:function(e,n,t){t.d(n,{Zo:function(){return u},kt:function(){return m}});var r=t(7294);function i(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function s(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function a(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?s(Object(t),!0).forEach((function(n){i(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):s(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function o(e,n){if(null==e)return{};var t,r,i=function(e,n){if(null==e)return{};var t,r,i={},s=Object.keys(e);for(r=0;r<s.length;r++)t=s[r],n.indexOf(t)>=0||(i[t]=e[t]);return i}(e,n);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(r=0;r<s.length;r++)t=s[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(i[t]=e[t])}return i}var c=r.createContext({}),l=function(e){var n=r.useContext(c),t=n;return e&&(t="function"==typeof e?e(n):a(a({},n),e)),t},u=function(e){var n=l(e.components);return r.createElement(c.Provider,{value:n},e.children)},p={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},d=r.forwardRef((function(e,n){var t=e.components,i=e.mdxType,s=e.originalType,c=e.parentName,u=o(e,["components","mdxType","originalType","parentName"]),d=l(t),m=i,f=d["".concat(c,".").concat(m)]||d[m]||p[m]||s;return t?r.createElement(f,a(a({ref:n},u),{},{components:t})):r.createElement(f,a({ref:n},u))}));function m(e,n){var t=arguments,i=n&&n.mdxType;if("string"==typeof e||i){var s=t.length,a=new Array(s);a[0]=d;var o={};for(var c in n)hasOwnProperty.call(n,c)&&(o[c]=n[c]);o.originalType=e,o.mdxType="string"==typeof e?e:i,a[1]=o;for(var l=2;l<s;l++)a[l]=t[l];return r.createElement.apply(null,a)}return r.createElement.apply(null,t)}d.displayName="MDXCreateElement"},4332:function(e,n,t){t.r(n),t.d(n,{assets:function(){return u},contentTitle:function(){return c},default:function(){return m},frontMatter:function(){return o},metadata:function(){return l},toc:function(){return p}});var r=t(3117),i=t(102),s=(t(7294),t(3905)),a=["components"],o={id:"redis-conns",title:"Redis Connections",sidebar_label:"Redis Connections"},c=void 0,l={unversionedId:"usage/redis-conns",id:"usage/redis-conns",title:"Redis Connections",description:"Keuss relies on ioredis for connecting to redis. Anytime a redis connection is needed, keuss will create it from the opts object passed:",source:"@site/docs/usage/redis-conns.md",sourceDirName:"usage",slug:"/usage/redis-conns",permalink:"/keuss/docs/usage/redis-conns",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/usage/redis-conns.md",tags:[],version:"current",frontMatter:{id:"redis-conns",title:"Redis Connections",sidebar_label:"Redis Connections"},sidebar:"someSidebar",previous:{title:"Using no signaller",permalink:"/keuss/docs/usage/no-signaller"},next:{title:"About",permalink:"/keuss/docs/usage/pipelines/about"}},u={},p=[{value:"Examples:",id:"examples",level:2}],d={toc:p};function m(e){var n=e.components,t=(0,i.Z)(e,a);return(0,s.kt)("wrapper",(0,r.Z)({},d,t,{components:n,mdxType:"MDXLayout"}),(0,s.kt)("p",null,"Keuss relies on ",(0,s.kt)("a",{parentName:"p",href:"https://www.npmjs.com/package/ioredis"},"ioredis")," for connecting to redis. Anytime a redis connection is needed, keuss will create it from the opts object passed:"),(0,s.kt)("ul",null,(0,s.kt)("li",{parentName:"ul"},"If ",(0,s.kt)("inlineCode",{parentName:"li"},"opts")," is a function, it is executed. It is expected to return a redis connection"),(0,s.kt)("li",{parentName:"ul"},"If it's an object and contains a ",(0,s.kt)("inlineCode",{parentName:"li"},"Redis")," field, this field is used to create a new ",(0,s.kt)("a",{parentName:"li",href:"https://github.com/luin/ioredis"},"ioredis Redis object"),", as in ",(0,s.kt)("em",{parentName:"li"},"return new Redis (opts.Redis)")),(0,s.kt)("li",{parentName:"ul"},"if it's an object and contains a ",(0,s.kt)("inlineCode",{parentName:"li"},"Cluster")," field, this field is used to create a new ",(0,s.kt)("a",{parentName:"li",href:"https://redis.io/topics/cluster-spec"},"ioredis Redis.Cluster")," object, as in ",(0,s.kt)("em",{parentName:"li"},"return new Redis.Cluster (opts.Cluster)")),(0,s.kt)("li",{parentName:"ul"},"Else, a ioredis Redis object is created with ",(0,s.kt)("inlineCode",{parentName:"li"},"opts")," as param, as in ",(0,s.kt)("em",{parentName:"li"},"return new Redis (opts)"))),(0,s.kt)("p",null,"This apparent complexity is required since redis connections are inherently created in a different way for standalone, sentinel and cluster servers"),(0,s.kt)("h2",{id:"examples"},"Examples:"),(0,s.kt)("ul",null,(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("p",{parentName:"li"},"Default options:"),(0,s.kt)("pre",{parentName:"li"},(0,s.kt)("code",{parentName:"pre",className:"language-javascript"},"var MQ = require ('keuss/backends/redis-list');\nvar factory_opts = {};\n\nMQ (factory_opts, (err, factory) => {\n  ...\n});\n"))),(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("p",{parentName:"li"},"Specific redis params for ioredis Redis client:"),(0,s.kt)("pre",{parentName:"li"},(0,s.kt)("code",{parentName:"pre",className:"language-javascript"},"var MQ = require ('keuss/backends/redis-list');\nvar factory_opts = {\n  redis: {\n    Redis: {\n      port: 12293,\n      host: 'some-redis-instance.somewhere.com',\n      family: 4,\n      password: 'xxxx',\n      db: 0\n    }\n  }\n};\n\nMQ (factory_opts, (err, factory) => {\n  ...\n});\n"))),(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("p",{parentName:"li"},"Using a factory function:"),(0,s.kt)("pre",{parentName:"li"},(0,s.kt)("code",{parentName:"pre",className:"language-javascript"},"var MQ = require ('keuss/backends/redis-list');\nvar Redis = require ('ioredis');\nvar factory_opts = {\n  redis: function () {\n    return new Redis ({\n      port: 12293,\n      host: 'some-redis-instance.somewhere.com',\n      family: 4,\n      password: 'xxxx',\n      db: 0\n    })\n  }\n};\n\nMQ (factory_opts, (err, factory) => {\n  ...\n});\n")))))}m.isMDXComponent=!0}}]);