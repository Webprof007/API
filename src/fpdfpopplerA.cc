#include <nan.h>
#include <QtCore/QBuffer>

#include "fpdfpoppler.h"

using v8::Function;
using v8::Local;
using v8::Null;
using v8::Number;
using v8::Value;
using v8::Object;
using v8::String;
using v8::Array;

using namespace std;

class PdfWriter : public Nan::AsyncWorker {
    public:
        PdfWriter(Nan::Callback *callback, struct WriteFieldsParams params)
        : Nan::AsyncWorker(callback), params(params) {}
        ~PdfWriter(){}

        void Execute() {
            try {
                buffer = writePdfFields(params);
            } catch(string error) {
                SetErrorMessage(error.c_str());
            }
        }

        void HandleOKCallback() {
            Nan::HandleScope scope;
            Local<Value> argv[] = {
                Nan::Null(),
                Nan::CopyBuffer((char *)buffer->data().data(), buffer->size()).ToLocalChecked()
            };
            buffer->close();
            delete buffer;
            callback->Call(2, argv);
        }

    private:
        QBuffer *buffer;
        WriteFieldsParams params;
};

NAN_METHOD(WritePdfA) {
    WriteFieldsParams params = v8ParamsToCpp(info);

    Nan::Callback *callback = new Nan::Callback(info[3].As<Function>());

    PdfWriter *writer = new PdfWriter(callback, params);
    Nan::AsyncQueueWorker(writer);
}