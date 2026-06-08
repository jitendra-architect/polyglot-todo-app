'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">nest-ssr-todo documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                                <li class="link">
                                    <a href="overview.html" data-type="chapter-link">
                                        <span class="icon ion-ios-keypad"></span>Overview
                                    </a>
                                </li>

                            <li class="link">
                                <a href="index.html" data-type="chapter-link">
                                    <span class="icon ion-ios-paper"></span>
                                        README
                                </a>
                            </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>

                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/CacheModule.html" data-type="entity-link" >CacheModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CacheModule-54278932fe86d3b7eee5e4ed708325e4512c47193cfc9a9652bb589a9f9535b69ef3c6274550287acb1b88ec7b22f048af9ca7646b77090b3826c1c0b7fc6429"' : 'data-bs-target="#xs-injectables-links-module-CacheModule-54278932fe86d3b7eee5e4ed708325e4512c47193cfc9a9652bb589a9f9535b69ef3c6274550287acb1b88ec7b22f048af9ca7646b77090b3826c1c0b7fc6429"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CacheModule-54278932fe86d3b7eee5e4ed708325e4512c47193cfc9a9652bb589a9f9535b69ef3c6274550287acb1b88ec7b22f048af9ca7646b77090b3826c1c0b7fc6429"' :
                                        'id="xs-injectables-links-module-CacheModule-54278932fe86d3b7eee5e4ed708325e4512c47193cfc9a9652bb589a9f9535b69ef3c6274550287acb1b88ec7b22f048af9ca7646b77090b3826c1c0b7fc6429"' }>
                                        <li class="link">
                                            <a href="injectables/CacheService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CacheService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/HealthModule.html" data-type="entity-link" >HealthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-HealthModule-b966f9f214b66c618a4e8079e4f7e68e833b41c7de16ef468fe2b54fe268b0cb13c7f1c27a896f1bce36cac242fd6cde5f5651132faeebdb3015f7493b9107c4"' : 'data-bs-target="#xs-controllers-links-module-HealthModule-b966f9f214b66c618a4e8079e4f7e68e833b41c7de16ef468fe2b54fe268b0cb13c7f1c27a896f1bce36cac242fd6cde5f5651132faeebdb3015f7493b9107c4"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-HealthModule-b966f9f214b66c618a4e8079e4f7e68e833b41c7de16ef468fe2b54fe268b0cb13c7f1c27a896f1bce36cac242fd6cde5f5651132faeebdb3015f7493b9107c4"' :
                                            'id="xs-controllers-links-module-HealthModule-b966f9f214b66c618a4e8079e4f7e68e833b41c7de16ef468fe2b54fe268b0cb13c7f1c27a896f1bce36cac242fd6cde5f5651132faeebdb3015f7493b9107c4"' }>
                                            <li class="link">
                                                <a href="controllers/HealthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HealthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-HealthModule-b966f9f214b66c618a4e8079e4f7e68e833b41c7de16ef468fe2b54fe268b0cb13c7f1c27a896f1bce36cac242fd6cde5f5651132faeebdb3015f7493b9107c4"' : 'data-bs-target="#xs-injectables-links-module-HealthModule-b966f9f214b66c618a4e8079e4f7e68e833b41c7de16ef468fe2b54fe268b0cb13c7f1c27a896f1bce36cac242fd6cde5f5651132faeebdb3015f7493b9107c4"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-HealthModule-b966f9f214b66c618a4e8079e4f7e68e833b41c7de16ef468fe2b54fe268b0cb13c7f1c27a896f1bce36cac242fd6cde5f5651132faeebdb3015f7493b9107c4"' :
                                        'id="xs-injectables-links-module-HealthModule-b966f9f214b66c618a4e8079e4f7e68e833b41c7de16ef468fe2b54fe268b0cb13c7f1c27a896f1bce36cac242fd6cde5f5651132faeebdb3015f7493b9107c4"' }>
                                        <li class="link">
                                            <a href="injectables/HealthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HealthService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/JobsModule.html" data-type="entity-link" >JobsModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-JobsModule-9693e1fedf7069ff91afbdea1c92fa5a5939e08bc72ccc2f0a228003b9981d707375156880f99d5223b8e8684dc0210635ee3d75e7db5a0e71814edfb81789f7"' : 'data-bs-target="#xs-injectables-links-module-JobsModule-9693e1fedf7069ff91afbdea1c92fa5a5939e08bc72ccc2f0a228003b9981d707375156880f99d5223b8e8684dc0210635ee3d75e7db5a0e71814edfb81789f7"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-JobsModule-9693e1fedf7069ff91afbdea1c92fa5a5939e08bc72ccc2f0a228003b9981d707375156880f99d5223b8e8684dc0210635ee3d75e7db5a0e71814edfb81789f7"' :
                                        'id="xs-injectables-links-module-JobsModule-9693e1fedf7069ff91afbdea1c92fa5a5939e08bc72ccc2f0a228003b9981d707375156880f99d5223b8e8684dc0210635ee3d75e7db5a0e71814edfb81789f7"' }>
                                        <li class="link">
                                            <a href="injectables/TodoQueueService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TodoQueueService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/TemplatePlaygroundModule.html" data-type="entity-link" >TemplatePlaygroundModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#components-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' : 'data-bs-target="#xs-components-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' :
                                            'id="xs-components-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' }>
                                            <li class="link">
                                                <a href="components/TemplatePlaygroundComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TemplatePlaygroundComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' : 'data-bs-target="#xs-injectables-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' :
                                        'id="xs-injectables-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' }>
                                        <li class="link">
                                            <a href="injectables/HbsRenderService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HbsRenderService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/TemplateEditorService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TemplateEditorService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ZipExportService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ZipExportService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/TodosModule.html" data-type="entity-link" >TodosModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-TodosModule-1dfeed4ad34438c04021448b116e237cf220be85d4178eceafd2c401fe45185004b8c2585be732b7dbd08d887d03a8687ea10694b71c5be7359852ce3328ab8a"' : 'data-bs-target="#xs-controllers-links-module-TodosModule-1dfeed4ad34438c04021448b116e237cf220be85d4178eceafd2c401fe45185004b8c2585be732b7dbd08d887d03a8687ea10694b71c5be7359852ce3328ab8a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-TodosModule-1dfeed4ad34438c04021448b116e237cf220be85d4178eceafd2c401fe45185004b8c2585be732b7dbd08d887d03a8687ea10694b71c5be7359852ce3328ab8a"' :
                                            'id="xs-controllers-links-module-TodosModule-1dfeed4ad34438c04021448b116e237cf220be85d4178eceafd2c401fe45185004b8c2585be732b7dbd08d887d03a8687ea10694b71c5be7359852ce3328ab8a"' }>
                                            <li class="link">
                                                <a href="controllers/TodosApiController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TodosApiController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/TodosViewController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TodosViewController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-TodosModule-1dfeed4ad34438c04021448b116e237cf220be85d4178eceafd2c401fe45185004b8c2585be732b7dbd08d887d03a8687ea10694b71c5be7359852ce3328ab8a"' : 'data-bs-target="#xs-injectables-links-module-TodosModule-1dfeed4ad34438c04021448b116e237cf220be85d4178eceafd2c401fe45185004b8c2585be732b7dbd08d887d03a8687ea10694b71c5be7359852ce3328ab8a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-TodosModule-1dfeed4ad34438c04021448b116e237cf220be85d4178eceafd2c401fe45185004b8c2585be732b7dbd08d887d03a8687ea10694b71c5be7359852ce3328ab8a"' :
                                        'id="xs-injectables-links-module-TodosModule-1dfeed4ad34438c04021448b116e237cf220be85d4178eceafd2c401fe45185004b8c2585be732b7dbd08d887d03a8687ea10694b71c5be7359852ce3328ab8a"' }>
                                        <li class="link">
                                            <a href="injectables/TodosService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TodosService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#entities-links"' :
                                'data-bs-target="#xs-entities-links"' }>
                                <span class="icon ion-ios-apps"></span>
                                <span>Entities</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="entities-links"' : 'id="xs-entities-links"' }>
                                <li class="link">
                                    <a href="entities/TodoEntity.html" data-type="entity-link" >TodoEntity</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AllExceptionsFilter.html" data-type="entity-link" >AllExceptionsFilter</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateTodoDto.html" data-type="entity-link" >CreateTodoDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ListTodosQueryDto.html" data-type="entity-link" >ListTodosQueryDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/Todo.html" data-type="entity-link" >Todo</a>
                            </li>
                            <li class="link">
                                <a href="classes/TodoEntity.html" data-type="entity-link" >TodoEntity</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateTodoDto.html" data-type="entity-link" >UpdateTodoDto</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/CorrelationIdInterceptor.html" data-type="entity-link" >CorrelationIdInterceptor</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CorrelationIdMiddleware.html" data-type="entity-link" >CorrelationIdMiddleware</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MongoTodosRepository.html" data-type="entity-link" >MongoTodosRepository</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/TypeOrmTodosRepository.html" data-type="entity-link" >TypeOrmTodosRepository</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/CompoDocConfig.html" data-type="entity-link" >CompoDocConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CorrelatedRequest.html" data-type="entity-link" >CorrelatedRequest</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DeleteResult.html" data-type="entity-link" >DeleteResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ITodosRepository.html" data-type="entity-link" >ITodosRepository</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Session.html" data-type="entity-link" >Session</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Template.html" data-type="entity-link" >Template</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TodoCreatedPayload.html" data-type="entity-link" >TodoCreatedPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TodoListResult.html" data-type="entity-link" >TodoListResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TodoResponse.html" data-type="entity-link" >TodoResponse</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});