const Backbone = require('backbone');
const KdbxImport = require('kdbx-import').KdbxImport;
const Alerts = require('../../comp/alerts');
const Locale = require('../../util/locale');

const ImportOtherView = Backbone.View.extend({
    template: require('templates/import/other.hbs'),

    events: {
        'change .import__file-ctrl': 'fileSelected',
        'click .import__icon-import': 'fileChooser',
        'dragover': 'dragover',
        'dragleave': 'dragleave',
        'drop': 'drop'
    },

    render() {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.renderTemplate();
        return this;
    },

    fileChooser: function(e) {
        this.fileData = null;
        const fileInput = this.$el.find('.import__file-ctrl').attr('accept', 'csv').val(null);
        fileInput.click();
    },

    fileSelected: function(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    },

    processCSV: async function(csv) {
        const startTime = Date.now();
        const importResult = await KdbxImport.fromGenericCSV(this.model.files.first().db.meta, csv);
        const error = this.model.files.first().importFromKdbx(importResult.db);
        const time = Date.now() - startTime;

        if (error) {
            window.trackMatomoAction(['trackEvent', 'Import', 'Error', 'other', time]);
            return error;
        }
        window.trackMatomoAction(['trackEvent', 'Import', 'Success', 'other', time]);
    },

    processFile: function(file, complete) {
        const reader = new FileReader();
        reader.onload = async e => {
            const error = await this.processCSV(e.target.result);
            if (error) {
                Alerts.error({ header: Locale.openWrongFile, body: Locale.openWrongFileCSV });
            } else {
                Backbone.trigger('show-entries');
            }
        };
        reader.onerror = () => {
            Alerts.error({ header: Locale.openFailedRead });
        };
        reader.readAsText(file);
    },

    processText: async function(text) {
        const error = await this.processCSV(text);
        if (error) {
            Alerts.error({ header: Locale.openWrongText, body: Locale.openWrongTextCSV });
        } else {
            Backbone.trigger('show-entries');
        }
    },

    dragover: function(e) {
        e.preventDefault();
        e.stopPropagation();
        const dt = e.originalEvent.dataTransfer;
        dt.dropEffect = 'copy';
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        if (!this.$el.hasClass('import--drag')) {
            this.$el.addClass('import--drag');
        }
    },

    dragleave: function() {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.dragTimeout = setTimeout(() => {
            this.$el.removeClass('import--drag');
        }, 100);
    },

    drop: function(e) {
        e.preventDefault();
        if (this.busy) {
            return;
        }
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.$el.removeClass('import--drag');
        const text = e.originalEvent.dataTransfer.getData('Text');
        if (text) {
            this.processText(text);
        } else {
            const files = e.target.files || e.originalEvent.dataTransfer.files;
            const csvFile = _.find(files, file => file.name.split('.').pop().toLowerCase() === 'csv');
            if (csvFile) {
                this.processFile(csvFile);
            } else {
                Alerts.error({ header: Locale.openWrongFile, body: Locale.openWrongFileCSV });
            }
        }
    }
});

module.exports = ImportOtherView;
