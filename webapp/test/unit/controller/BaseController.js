/*global QUnit*/

sap.ui.define([
    "zhrsanctions/controller/BaseController"
], function (BaseController) {
    "use strict";

    QUnit.module("BaseController");

    QUnit.test("clearFileUploadState resets pending files and clears uploader control", function (assert) {
        const controller = Object.create(BaseController.prototype);
        controller._pendingFiles = [{ name: "attachment.txt" }];

        const clearedIds = [];
        controller.byId = function (id) {
            return {
                clear() {
                    clearedIds.push(id);
                }
            };
        };

        controller.clearFileUploadState("hcfileUploader");

        assert.deepEqual(controller._pendingFiles, [], "Pending files should be reset.");
        assert.deepEqual(clearedIds, ["hcfileUploader"], "Uploader control should be cleared.");
    });
});
