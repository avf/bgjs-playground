import * as _ from 'lodash'

// Fixes a problem with live reload in the parcel bundler. See this issue: https://github.com/parcel-bundler/parcel/issues/289
declare let module: any;
if (module.hot) {
    module.hot.dispose(() => {
        window.location.reload();
    })
}
