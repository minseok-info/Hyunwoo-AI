---
nodeId: 25cabb8b-61db-454a-935a-4811577edc3c
name: Normalizing Flows (NF)
tags: []
children: []
updatedAt: 2026-03-01T13:47:53.527058Z
---

# Normalizing Flows (NF)

# Normalizing Flows (NF)

Paper: Density estimation using Real NVP (2017)


NF의 핵심 아키텍처는 Affine Coupling Layer의 연쇄입니다. 

데이터를 절반으로 나누어 한쪽이 다른 쪽을 변환하는 가역적 구조를 가집니다.

- Input ($z$ 또는 $x$): 다차원 데이터를 준비합니다.
- Coupling Step: 입력 차원을 $1:d$와 $d+1:D$로 분할합니다.
- Forward Path ($z \to x$): 한쪽은 그대로 두고, 다른 한쪽은 신경망이 예측한 스케일($s$)과 이동($t$) 값을 이용해 변환합니다.
- Inverse Path ($x \to z$): 연산 순서와 부호만 바꾸면 완벽하게 입력값으로 되돌릴 수 있습니다.

### 

$$\log p_X(x) = \log p_Z(z) - \sum_{i=1}^{K} \log \left| \det \left( \frac{\partial f_i}{\partial z_{i-1}} \right) \right|$$


- logpX​(x)
  - Target Log-Likelihood
  - 우리가 구하고자 하는 실제 데이터 x의 로그 확률 밀도
- logpZ​(z)
  - Base Log-Likelihood
  - 변환 전 단순한 분포(가우시안)에서의 로그 확률
- ∑i=1K​
  - Chain Composition
  - K개의 층(Layer)을 통과하며 누적된 변화량을 모두 합산
- ​$$\frac{\partial f_i}{\partial z_{i-1}}$$
  -  Jacobian of f at x.
  - i−1번째 층의 입력 변화에 따른 i번째 층의 출력 변화를 기록한 행렬
- det(J)
  - Determinant
  - 변환 과정에서 해당 층이 공간을 몇 배나 늘렸는지(부피 변화율)

우변의 2번째 항 빼는 이유: Normalization을 위함. 공간이 넓어지면 밀도는 낮아져야 하므로, 부피 변화량만큼 확률을 차감해 주는 보정 기법


### Affine Coupling


$$y_{1:d} = x_{1:d}$$

$$y_{d+1:D} = x_{d+1:D} \odot \exp(s(x_{1:d})) + t(x_{1:d})$$

- $s(\cdot), t(\cdot)$: 신경망(Deep Neural Networks). 이들은 역함수가 필요 없으므로 매우 복잡한 모델을 쓸 수 있습니다.
- $\exp(s)$: 공간을 얼마나 늘리고 줄일지 결정하는 Scale 값입니다.
- $+ t$: 공간을 얼마나 이동시킬지 결정하는 Translation 값입니다.

Jacobian이 Triangular 되어서 det을 대각 성분의 곱으로 연산에 좋게 ..!
