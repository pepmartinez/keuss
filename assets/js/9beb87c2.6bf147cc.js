"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[80],{3905:function(e,t,a){a.d(t,{Zo:function(){return m},kt:function(){return c}});var n=a(7294);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function l(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function i(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?l(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):l(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function u(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},l=Object.keys(e);for(n=0;n<l.length;n++)a=l[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(n=0;n<l.length;n++)a=l[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var o=n.createContext({}),p=function(e){var t=n.useContext(o),a=t;return e&&(a="function"==typeof e?e(t):i(i({},t),e)),a},m=function(e){var t=p(e.components);return n.createElement(o.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},s=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,l=e.originalType,o=e.parentName,m=u(e,["components","mdxType","originalType","parentName"]),s=p(a),c=r,k=s["".concat(o,".").concat(c)]||s[c]||d[c]||l;return a?n.createElement(k,i(i({ref:t},m),{},{components:a})):n.createElement(k,i({ref:t},m))}));function c(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var l=a.length,i=new Array(l);i[0]=s;var u={};for(var o in t)hasOwnProperty.call(t,o)&&(u[o]=t[o]);u.originalType=e,u.mdxType="string"==typeof e?e:r,i[1]=u;for(var p=2;p<l;p++)i[p]=a[p];return n.createElement.apply(null,i)}return n.createElement.apply(null,a)}s.displayName="MDXCreateElement"},1016:function(e,t,a){a.r(t),a.d(t,{frontMatter:function(){return u},contentTitle:function(){return o},metadata:function(){return p},toc:function(){return m},default:function(){return s}});var n=a(3117),r=a(102),l=(a(7294),a(3905)),i=["components"],u={id:"changelog",title:"Changelog",sidebar_label:"Changelog"},o=void 0,p={unversionedId:"changelog",id:"changelog",title:"Changelog",description:"* v1.6.10",source:"@site/docs/changelog.md",sourceDirName:".",slug:"/changelog",permalink:"/keuss/docs/changelog",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/changelog.md",tags:[],version:"current",frontMatter:{id:"changelog",title:"Changelog",sidebar_label:"Changelog"},sidebar:"someSidebar",previous:{title:"Examples",permalink:"/keuss/docs/examples"}},m=[],d={toc:m};function s(e){var t=e.components,a=(0,r.Z)(e,i);return(0,l.kt)("wrapper",(0,n.Z)({},d,a,{components:t,mdxType:"MDXLayout"}),(0,l.kt)("ul",null,(0,l.kt)("li",{parentName:"ul"},"v1.6.10",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"updated deps"),(0,l.kt)("li",{parentName:"ul"},"add 'deadletter' to stats, for elements moved to deadletter queue"))),(0,l.kt)("li",{parentName:"ul"},"v1.6.9",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"fix glitch in remove item on tape mongo (ps-mongo)"))),(0,l.kt)("li",{parentName:"ul"},"v1.6.8",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"added remove-by-id support "))),(0,l.kt)("li",{parentName:"ul"},"v1.6.7",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"small fix on deadetter signalling   "))),(0,l.kt)("li",{parentName:"ul"},"v1.6.6",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"added reserve, commit, rollback counters to stats"),(0,l.kt)("li",{parentName:"ul"},"fixed mongo-driver deprecation"))),(0,l.kt)("li",{parentName:"ul"},"v1.6.5",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"dependencies updated"))),(0,l.kt)("li",{parentName:"ul"},"v1.6.4",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"dependencies updated"))),(0,l.kt)("li",{parentName:"ul"},"v1.6.3",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"added support for headers (along with payload)"))),(0,l.kt)("li",{parentName:"ul"},"v1.6.2",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"payload can be of type object, string, number of buffer"))),(0,l.kt)("li",{parentName:"ul"},"v1.6.1",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"added Docusaurus based documentation"),(0,l.kt)("li",{parentName:"ul"},"fixed deps' vulnerabilities"))),(0,l.kt)("li",{parentName:"ul"},"v1.6.0",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"added sane defaults for stats and signal for mongodb-based backends (using mongo stats and signal)"),(0,l.kt)("li",{parentName:"ul"},"added pipeline builder"),(0,l.kt)("li",{parentName:"ul"},"added ability to create a full pipeline from text (making it trivial to be stored in file)"))),(0,l.kt)("li",{parentName:"ul"},"v1.5.12",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"corrected small pipeline-related issues"))),(0,l.kt)("li",{parentName:"ul"},"v1.5.11 (void)"),(0,l.kt)("li",{parentName:"ul"},"v1.5.10",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"pipelines overhaul"),(0,l.kt)("li",{parentName:"ul"},"mubsub change to @nodebb/mubsub"))),(0,l.kt)("li",{parentName:"ul"},"v1.5.9:",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"added some complete, meaningful examples"))),(0,l.kt)("li",{parentName:"ul"},"v1.5.8",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"added deadletter support"))),(0,l.kt)("li",{parentName:"ul"},"v1.5.7",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"added resvSize support"))),(0,l.kt)("li",{parentName:"ul"},"v1.5.4:",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"added pause support"),(0,l.kt)("li",{parentName:"ul"},"deps updated"))),(0,l.kt)("li",{parentName:"ul"},"v1.5.3:",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"use mongodb driver v3.2 (was v2.2)"))),(0,l.kt)("li",{parentName:"ul"},"v1.5.2",(0,l.kt)("ul",{parentName:"li"},(0,l.kt)("li",{parentName:"ul"},"added bucket-based backends: 2 backends using buckets/buffering on top of mongodb")))))}s.isMDXComponent=!0}}]);