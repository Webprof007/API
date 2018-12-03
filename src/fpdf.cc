#include <nan.h>
#include "fpdfpoppler.h"
#include "fpdfpopplerA.h"

using v8::FunctionTemplate;

NAN_MODULE_INIT(InitAll) {

  Nan::Set(target, Nan::New("readPdf").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(ReadPdf)).ToLocalChecked());

  Nan::Set(target, Nan::New("writePdf").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(WritePdf)).ToLocalChecked());

  Nan::Set(target, Nan::New("writePdfA").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(WritePdfA)).ToLocalChecked());

}

NODE_MODULE(fpdf, InitAll)
