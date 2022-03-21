"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[691],{3905:function(e,n,t){t.d(n,{Zo:function(){return u},kt:function(){return f}});var r=t(7294);function a(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function i(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function o(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?i(Object(t),!0).forEach((function(n){a(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):i(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function l(e,n){if(null==e)return{};var t,r,a=function(e,n){if(null==e)return{};var t,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)>=0||(a[t]=e[t]);return a}(e,n);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(a[t]=e[t])}return a}var s=r.createContext({}),p=function(e){var n=r.useContext(s),t=n;return e&&(t="function"==typeof e?e(n):o(o({},n),e)),t},u=function(e){var n=p(e.components);return r.createElement(s.Provider,{value:n},e.children)},c={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},d=r.forwardRef((function(e,n){var t=e.components,a=e.mdxType,i=e.originalType,s=e.parentName,u=l(e,["components","mdxType","originalType","parentName"]),d=p(t),f=a,m=d["".concat(s,".").concat(f)]||d[f]||c[f]||i;return t?r.createElement(m,o(o({ref:n},u),{},{components:t})):r.createElement(m,o({ref:n},u))}));function f(e,n){var t=arguments,a=n&&n.mdxType;if("string"==typeof e||a){var i=t.length,o=new Array(i);o[0]=d;var l={};for(var s in n)hasOwnProperty.call(n,s)&&(l[s]=n[s]);l.originalType=e,l.mdxType="string"==typeof e?e:a,o[1]=l;for(var p=2;p<i;p++)o[p]=t[p];return r.createElement.apply(null,o)}return r.createElement.apply(null,t)}d.displayName="MDXCreateElement"},6393:function(e,n,t){t.r(n),t.d(n,{assets:function(){return u},contentTitle:function(){return s},default:function(){return f},frontMatter:function(){return l},metadata:function(){return p},toc:function(){return c}});var r=t(3117),a=t(102),i=(t(7294),t(3905)),o=["components"],l={id:"no-signaller",title:"Using no signaller",sidebar_label:"Using no signaller"},s=void 0,p={unversionedId:"usage/no-signaller",id:"usage/no-signaller",title:"Using no signaller",description:"Even when using signallers, pop operations on queue never block or wait forever; waiting pop operations are anyway terminated after 15000 millisecs",source:"@site/docs/usage/no-signaller.md",sourceDirName:"usage",slug:"/usage/no-signaller",permalink:"/keuss/docs/usage/no-signaller",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/usage/no-signaller.md",tags:[],version:"current",frontMatter:{id:"no-signaller",title:"Using no signaller",sidebar_label:"Using no signaller"},sidebar:"someSidebar",previous:{title:"Shutdown",permalink:"/keuss/docs/usage/shutdown"},next:{title:"Redis Connections",permalink:"/keuss/docs/usage/redis-conns"}},u={},c=[],d={toc:c};function f(e){var n=e.components,t=(0,a.Z)(e,o);return(0,i.kt)("wrapper",(0,r.Z)({},d,t,{components:n,mdxType:"MDXLayout"}),(0,i.kt)("p",null,"Even when using signallers, ",(0,i.kt)("inlineCode",{parentName:"p"},"pop")," operations on queue never block or wait forever; waiting ",(0,i.kt)("inlineCode",{parentName:"p"},"pop")," operations are anyway terminated after 15000 millisecs\nor whatever specified in the ",(0,i.kt)("inlineCode",{parentName:"p"},"pollInterval")," parameter) and silently re-initiated. That is, a ",(0,i.kt)("inlineCode",{parentName:"p"},"pop()")," on an empty queue will appear blocked forever to\nthe caller, but behind the scenes it'll work pretty much as if it were doing a poll every 15 secs"),(0,i.kt)("p",null,"If a signaller is used (or if a signaller other than ",(0,i.kt)("inlineCode",{parentName:"p"},"local")," is used, if ",(0,i.kt)("inlineCode",{parentName:"p"},"push()")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"pop()")," happen on different machines) the ",(0,i.kt)("inlineCode",{parentName:"p"},"pop()")," will be awaken almost\nimmediately after the ",(0,i.kt)("inlineCode",{parentName:"p"},"push()"),"; if no signaller is used (or ",(0,i.kt)("inlineCode",{parentName:"p"},"local"),"is used, but the action happens in separated machines) ",(0,i.kt)("inlineCode",{parentName:"p"},"pop()")," will behave exactly as if\nit were doing a poll() internally;"),(0,i.kt)("p",null,"Another way to put it is, ",(0,i.kt)("inlineCode",{parentName:"p"},"pop()")," operations would have a maximum latency of ",(0,i.kt)("inlineCode",{parentName:"p"},"pollInterval")," millisecs, but also provides a safe backup in the event of\nsignalling loss."))}f.isMDXComponent=!0}}]);