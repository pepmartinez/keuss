"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[613],{3905:function(e,n,t){t.d(n,{Zo:function(){return c},kt:function(){return m}});var i=t(7294);function r(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function a(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);n&&(i=i.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,i)}return t}function l(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?a(Object(t),!0).forEach((function(n){r(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):a(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function o(e,n){if(null==e)return{};var t,i,r=function(e,n){if(null==e)return{};var t,i,r={},a=Object.keys(e);for(i=0;i<a.length;i++)t=a[i],n.indexOf(t)>=0||(r[t]=e[t]);return r}(e,n);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(i=0;i<a.length;i++)t=a[i],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(r[t]=e[t])}return r}var s=i.createContext({}),p=function(e){var n=i.useContext(s),t=n;return e&&(t="function"==typeof e?e(n):l(l({},n),e)),t},c=function(e){var n=p(e.components);return i.createElement(s.Provider,{value:n},e.children)},u={inlineCode:"code",wrapper:function(e){var n=e.children;return i.createElement(i.Fragment,{},n)}},d=i.forwardRef((function(e,n){var t=e.components,r=e.mdxType,a=e.originalType,s=e.parentName,c=o(e,["components","mdxType","originalType","parentName"]),d=p(t),m=r,h=d["".concat(s,".").concat(m)]||d[m]||u[m]||a;return t?i.createElement(h,l(l({ref:n},c),{},{components:t})):i.createElement(h,l({ref:n},c))}));function m(e,n){var t=arguments,r=n&&n.mdxType;if("string"==typeof e||r){var a=t.length,l=new Array(a);l[0]=d;var o={};for(var s in n)hasOwnProperty.call(n,s)&&(o[s]=n[s]);o.originalType=e,o.mdxType="string"==typeof e?e:r,l[1]=o;for(var p=2;p<a;p++)l[p]=t[p];return i.createElement.apply(null,l)}return i.createElement.apply(null,t)}d.displayName="MDXCreateElement"},4674:function(e,n,t){t.r(n),t.d(n,{frontMatter:function(){return o},contentTitle:function(){return s},metadata:function(){return p},toc:function(){return c},default:function(){return d}});var i=t(3117),r=t(102),a=(t(7294),t(3905)),l=["components"],o={id:"building",title:"Building Pipelines",sidebar_label:"Building"},s=void 0,p={unversionedId:"usage/pipelines/building",id:"usage/pipelines/building",title:"Building Pipelines",description:"Pipelines can be built in 3 ways:",source:"@site/docs/usage/pipelines/building.md",sourceDirName:"usage/pipelines",slug:"/usage/pipelines/building",permalink:"/keuss/docs/usage/pipelines/building",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/usage/pipelines/building.md",tags:[],version:"current",frontMatter:{id:"building",title:"Building Pipelines",sidebar_label:"Building"},sidebar:"someSidebar",previous:{title:"Processors",permalink:"/keuss/docs/usage/pipelines/processors"},next:{title:"Examples",permalink:"/keuss/docs/usage/pipelines/examples"}},c=[{value:"Direct Pipeline Creation",id:"direct-pipeline-creation",children:[],level:2},{value:"Creation with a <code>PipelineBuilder</code>",id:"creation-with-a-pipelinebuilder",children:[{value:"Pipepine object",id:"pipepine-object",children:[],level:3}],level:2},{value:"Creation with <code>Factory.pipelineFromRecipe</code>",id:"creation-with-factorypipelinefromrecipe",children:[],level:2}],u={toc:c};function d(e){var n=e.components,t=(0,r.Z)(e,l);return(0,a.kt)("wrapper",(0,i.Z)({},u,t,{components:n,mdxType:"MDXLayout"}),(0,a.kt)("p",null,"Pipelines can be built in 3 ways:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"By directly creating queues and processors, and bonding them together. This is rather low-level and is not the recommended way"),(0,a.kt)("li",{parentName:"ul"},"By using a ",(0,a.kt)("inlineCode",{parentName:"li"},"PipelineBuilder"),". This object provides a fluent API that's convenient and very simple. This is the recommended way to created pipelines in code"),(0,a.kt)("li",{parentName:"ul"},"By using the method ",(0,a.kt)("inlineCode",{parentName:"li"},"pipelineFromRecipe")," offered by the Queues Factories supporting pipelining. This allows a whole pipeline to be defined in a set of strings and therefore in external files; this makes pipelies portable, reproductible and totally cluster-ready")),(0,a.kt)("h2",{id:"direct-pipeline-creation"},"Direct Pipeline Creation"),(0,a.kt)("p",null,"This is a quite simple approach: you create the queues, then you create the Processors that would glue them. Processors take i theit constructors the queues they use, so it's rather straightforward:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-javascript"},"const MQ =  require ('../../../backends/pl-mongo');\nconst DCT = require ('../../../Pipeline/DirectLink');\nconst SNK = require ('../../../Pipeline/Sink');\nconst CHC = require ('../../../Pipeline/ChoiceLink');\n\nfunction sink_process (elem, done) {\n  // define processing for Sinks\n}\n\nconst factory_opts = {\n  // ...\n};\n\n// initialize factory\nMQ (factory_opts, (err, factory) => {\n  if (err) return console.error (err);\n\n  // factory ready, create queues on default pipeline\n  const q_opts = {aaa: 666, b: 'yy'};\n  const q1 = factory.queue ('pl_many_q_1', q_opts);\n  const q2 = factory.queue ('pl_many_q_2', q_opts);\n  const q3 = factory.queue ('pl_many_q_3', q_opts);\n  const q4 = factory.queue ('pl_many_q_4', q_opts);\n  const q5 = factory.queue ('pl_many_q_5', q_opts);\n\n  // tie them up:\n  const dl1 = new DCT (q1, q2);\n  const cl1 = new CHC (q2, [q3, q4, q5]);\n  const sk1 = new SNK (q3);\n  const sk2 = new SNK (q4);\n  const sk3 = new SNK (q5);\n\n  sk1.on_data (sink_process);\n  sk2.on_data (sink_process);\n  sk3.on_data (sink_process);\n\n  cl1.on_data (function (elem, done) {\n    // define processing for the ChoiceLink\n  });\n\n  dl1.on_data (function (elem, done) {\n    // define processing for the DirectLink\n  });\n\n  // start the whole lot\n  sk1.start ();\n  sk2.start ();\n  sk3.start ();\n  cl1.start ();\n  dl1.start ();\n\n  // pipeline is ready now. Push stuff to queues, see it work\n});\n\n")),(0,a.kt)("p",null,"See ",(0,a.kt)("a",{parentName:"p",href:"/keuss/docs/usage/pipelines/processors"},"Processors")," for all the available options and features (such as processing functions and error management)"),(0,a.kt)("h2",{id:"creation-with-a-pipelinebuilder"},"Creation with a ",(0,a.kt)("inlineCode",{parentName:"h2"},"PipelineBuilder")),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"PipelineBuilder")," provides a simpler way to create pipelines using a fluent api. Builders are obtained through ",(0,a.kt)("inlineCode",{parentName:"p"},"factory.builder()")," and offers the following methods:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"pipeline(name)"),": initializes a pipeline, passing a name to it. Must be called before any other method, and can be called only once"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"queue(name, opts)"),": creates a queue and adds it to the pipeline"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"directLink (name_src_q, name_dst_q, process_fn)"),": creates a DirectLink linking queues src_q and dst_q (specified by name), using the process function ",(0,a.kt)("inlineCode",{parentName:"li"},"process_fn")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"choiceLink(name_src_q, [name_dst_q1, name_dst_q2, ...name_dst_qn], process_fn)"),": creates a ChoiceLink linking src_q and the array of dst_q (specified by name), using the process function ",(0,a.kt)("inlineCode",{parentName:"li"},"process_fn")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"sink(name_src_q, process_fn)"),": creates a Sink on queue src_q (specified by name), using the process function ",(0,a.kt)("inlineCode",{parentName:"li"},"process_fn")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"onError(fn)"),": sets the ",(0,a.kt)("inlineCode",{parentName:"li"},"error")," event handler for all processirs created in the pipeline. As with the error handler for Processors, ",(0,a.kt)("inlineCode",{parentName:"li"},"fn")," will receive a single param with the error; in this case the error will be augmented by adding an extra field ",(0,a.kt)("inlineCode",{parentName:"li"},"processor"),", which will be areference to the ",(0,a.kt)("inlineCode",{parentName:"li"},"Processor")," object originating the error"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"done(err, pipeline)"),": finished the pipeline creation. No other calls can be done to the builder afterwards. In case of error, the error will be passed in ",(0,a.kt)("inlineCode",{parentName:"li"},"err"),"; if all went well ",(0,a.kt)("inlineCode",{parentName:"li"},"err")," will be ",(0,a.kt)("inlineCode",{parentName:"li"},"null")," and the newly created pipeline, an object of type ",(0,a.kt)("inlineCode",{parentName:"li"},"Pipeline"),", will be passed in the ",(0,a.kt)("inlineCode",{parentName:"li"},"pipeline"),"; all further interactions with the pipeline will happen through this object")),(0,a.kt)("h3",{id:"pipepine-object"},"Pipepine object"),(0,a.kt)("p",null,"The new Pipeline object exports the following methods:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"start()"),": starts the pipeline (simply calls ",(0,a.kt)("inlineCode",{parentName:"li"},"start()")," on all processors)"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"stop()"),": stops the pipeline (simply calls ",(0,a.kt)("inlineCode",{parentName:"li"},"stop()")," on all processors)")),(0,a.kt)("p",null,"Here's a simplified example (for a complete, working example see ",(0,a.kt)("a",{parentName:"p",href:"https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/builder"},"here"),"):"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-javascript"},"MQ (factory_opts, (err, factory) => {\n  if (err) return console.error (err);\n  const q_opts = {};\n\n  factory\n  .builder ()\n  .pipeline ('the-pipeline')\n  .queue ('test_pl_1', q_opts)\n  .queue ('test_pl_2', q_opts)\n  .queue ('test_pl_3', q_opts)\n  .queue ('test_pl_4', q_opts)\n  .queue ('test_pl_5', q_opts)\n  .directLink ('test_pl_1', 'test_pl_2', dl_process)\n  .choiceLink ('test_pl_2', ['test_pl_3', 'test_pl_4', 'test_pl_5'], choice_process)\n  .sink ('test_pl_3', sink_process)\n  .sink ('test_pl_4', sink_process)\n  .sink ('test_pl_5', sink_process)\n  .onError (console.log)\n  .done ((err, pl) => {\n    if (err) return console.error (err);\n    // pipeline pl is ready\n    pl.start ();\n    // pipeline pl is running\n  });\n});\n")),(0,a.kt)("h2",{id:"creation-with-factorypipelinefromrecipe"},"Creation with ",(0,a.kt)("inlineCode",{parentName:"h2"},"Factory.pipelineFromRecipe")),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"Factory.pipelineFromRecipe")," provides a way to define pipelines entirely from strings, including queue, processors, the functions\nto be used as process functions and all the code used on those functions. In this way a full, self-contained pipeline can be specified\nin a file or set of files"),(0,a.kt)("p",null,"Under the hood it uses ",(0,a.kt)("a",{parentName:"p",href:"https://nodejs.org/dist/latest-v12.x/docs/api/vm.html"},"node.js VM module")," to create the ",(0,a.kt)("inlineCode",{parentName:"p"},"Pipeline")," object: once created it can be used normally outside of the creation VM"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"Factory.pipelineFromRecipe")," is provided only on factories created from backends with pipelining support. This single method take the following parameters:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-javascript"},"Factory.pipelineFromRecipe (\n  pipeline_name,\n  array_of_bootstrap_code,\n  array_of_setup_code,\n  extra_context,\n  done\n)\n")),(0,a.kt)("ol",null,(0,a.kt)("li",{parentName:"ol"},"A new VM is created using the merge of the default context and the parameter ",(0,a.kt)("inlineCode",{parentName:"li"},"extra_context"),". The default context contains the following:",(0,a.kt)("ul",{parentName:"li"},(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"Buffer")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"require")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"clearImmediate"),", ",(0,a.kt)("inlineCode",{parentName:"li"},"clearInterval"),", ",(0,a.kt)("inlineCode",{parentName:"li"},"clearTimeout"),", ",(0,a.kt)("inlineCode",{parentName:"li"},"setImmediate"),", ",(0,a.kt)("inlineCode",{parentName:"li"},"setTimeout"),", ",(0,a.kt)("inlineCode",{parentName:"li"},"setInterval")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"TextEncoder"),", ",(0,a.kt)("inlineCode",{parentName:"li"},"TextDecoder")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"URL"),", ",(0,a.kt)("inlineCode",{parentName:"li"},"URLSearchParams")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"builder"),": an already initialized builder object, as in ",(0,a.kt)("inlineCode",{parentName:"li"},"factory.builder ().pipeline (name)")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"done"),": a function to call when the pipeline is ready, or an error arises. Expects to be ",(0,a.kt)("inlineCode",{parentName:"li"},"fn (err, pipeline)")))),(0,a.kt)("li",{parentName:"ol"},"Each of the strings in the ",(0,a.kt)("inlineCode",{parentName:"li"},"array_of_bootstrap_code")," is executed in the VM"),(0,a.kt)("li",{parentName:"ol"},"Each of the strings in the ",(0,a.kt)("inlineCode",{parentName:"li"},"array_of_setup_code")," is executed in the VM. It is expected to eventually call ",(0,a.kt)("inlineCode",{parentName:"li"},"done")," with the error or the finished pipeline (",(0,a.kt)("inlineCode",{parentName:"li"},"done"),"is accesible in the context)")),(0,a.kt)("p",null,"The whole idea is to prepare all the needed code for processors' functions in the ",(0,a.kt)("inlineCode",{parentName:"p"},"array_of_bootstrap_code"),", then create the pipeline in the ",(0,a.kt)("inlineCode",{parentName:"p"},"array_of_setup_code"),", calling the ",(0,a.kt)("inlineCode",{parentName:"p"},"done")," function whith the created pipeline"),(0,a.kt)("p",null,"You can find a full example ",(0,a.kt)("a",{parentName:"p",href:"https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/fromRecipe"},"here")))}d.isMDXComponent=!0}}]);