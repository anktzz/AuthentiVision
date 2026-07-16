# EfficientNet-B4 backbone + 2-class head, no timm, CPU only, no ImageNet download (from_name, not from_pretrained)
import torch.nn as nn
from efficientnet_pytorch import EfficientNet


class EfficientNetB4(nn.Module):
    def __init__(self, num_classes=2):
        super().__init__()
        self.efficientnet = EfficientNet.from_name("efficientnet-b4", num_classes=num_classes)  # architecture only

    def features(self, x):
        bs = x.size(0)
        x = self.efficientnet.extract_features(x)  # conv feature maps
        x = self.efficientnet._avg_pooling(x)  # global average pool
        x = x.view(bs, -1)  # flatten to (N, C)
        x = self.efficientnet._dropout(x)  # matches the package's own forward() before its fc layer
        return x

    def classifier(self, x):
        return self.efficientnet._fc(x)  # (N, num_classes) logits

    def forward(self, x):
        return self.classifier(self.features(x))  # end-to-end logits
